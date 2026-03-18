function decodeJwt(token) {
  const [, payload] = token.split(".");
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export class KypcarAuthManager {
  constructor({ httpClient, logger, baseUrl, email, password, userAgent }) {
    this.httpClient = httpClient;
    this.logger = logger;
    this.baseUrl = baseUrl;
    this.email = email;
    this.password = password;
    this.userAgent = userAgent;
    this.tokens = null;
    this.refreshInFlight = null;
  }

  async getAccessToken(context = {}) {
    if (!this.tokens?.accessToken) {
      await this.login(context);
      return this.tokens.accessToken;
    }

    const decoded = decodeJwt(this.tokens.accessToken);
    const now = Math.floor(Date.now() / 1000);

    if (!decoded?.exp || decoded.exp - now <= 30) {
      await this.refresh(context);
    }

    return this.tokens.accessToken;
  }

  async login(context = {}) {
    const body = await this.httpClient.requestJson({
      url: `${this.baseUrl}/auth/login`,
      method: "POST",
      headers: this.#jsonHeaders(),
      body: JSON.stringify({
        email: this.email,
        password: this.password,
      }),
      context: {
        ...context,
        integration: "kypcar_auth_login",
      },
    });

    this.tokens = this.#normalizeTokens(body);
    this.logger.info("Authenticated with Kypcar", context);
    return this.tokens;
  }

  async refresh(context = {}) {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    // Deduplicate concurrent refreshes so multiple webhook jobs do not stampede
    // the auth endpoint when the same token expires.
    this.refreshInFlight = this.#doRefresh(context);

    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  async #doRefresh(context) {
    if (!this.tokens?.refreshToken) {
      return this.login(context);
    }

    const body = await this.httpClient.requestJson({
      url: `${this.baseUrl}/auth/refresh`,
      method: "POST",
      headers: this.#jsonHeaders(),
      body: JSON.stringify({
        refresh_token: this.tokens.refreshToken,
      }),
      context: {
        ...context,
        integration: "kypcar_auth_refresh",
      },
    });

    this.tokens = this.#normalizeTokens(body);
    this.logger.info("Refreshed Kypcar token", context);
    return this.tokens;
  }

  #normalizeTokens(body) {
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      tokenType: body.token_type,
    };
  }

  #jsonHeaders() {
    return {
      "Content-Type": "application/json",
      "User-Agent": this.userAgent,
    };
  }
}
