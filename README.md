# Kypcar Exam Backend

Backend orientado a casos de uso para o desafio técnico da Kypcar. A aplicação autentica na API deles, registra webhook, recebe eventos com placa, consulta o veículo correspondente e cria a reserva de forma assíncrona, com observabilidade e tolerância a falhas.

## Decisões arquiteturais

- Clean Architecture: regras de negócio em `domain` e `app`, detalhes de IO em `infra`
- Webhook assíncrono: a API responde `202` imediatamente e delega o processamento para uma fila em memória
- Resiliência: cliente HTTP com retry exponencial e refresh automático do token
- Baixo acoplamento: casos de uso dependem de contratos implícitos, facilitando mocks e testes unitários
- Observabilidade: logs estruturados JSON com `correlation_id`, `event_id`, `plate` e metadados relevantes

## Estrutura

```text
src/
├── app/
│   ├── services/
│   └── use-cases/
├── bootstrap/
├── domain/
│   ├── entities/
│   ├── errors/
│   └── services/
└── infra/
    ├── config/
    ├── http/
    ├── kypcar/
    ├── logging/
    ├── persistence/
    └── queue/
```

## Fluxo de processamento

1. `POST /api/webhooks/kypcar` recebe o evento
2. a aplicação persiste o evento, gera `correlation_id` e responde `202`
3. um worker em memória processa o evento em background
4. o caso de uso extrai a placa, consulta o veículo e tenta criar a reserva
5. se houver conflito de agenda, o sistema tenta as próximas janelas disponíveis
6. o resultado fica disponível em `GET /api/events/:eventId`

Essa abordagem protege o SLA de 60 segundos porque o request HTTP do webhook não fica bloqueado aguardando chamadas externas.

## Configuração

Use `.env.example` como base:

```env
PORT=3000
HOST=0.0.0.0
APP_BASE_URL=https://seu-endpoint-publico
WEBHOOK_PATH=/api/webhooks/kypcar
AUTO_REGISTER_WEBHOOK=false
KYP_CAR_BASE_URL=https://dev.api.kypcar.com/v1/exam
KYP_CAR_EMAIL=your-email@example.com
KYP_CAR_PASSWORD=your-password
HTTP_TIMEOUT_MS=10000
HTTP_RETRY_ATTEMPTS=3
HTTP_RETRY_BASE_DELAY_MS=300
HTTP_MAX_RETRY_DELAY_MS=3000
RESERVATION_START_OFFSET_DAYS=1
RESERVATION_DURATION_DAYS=1
RESERVATION_MAX_DATE_ATTEMPTS=7
WEBHOOK_REGISTRATION_FILE=./storage-data/webhook-registration.json
```

## Execução local

```bash
npm start
```

Endpoints:

- `GET /health`
- `GET /api/status`
- `POST /api/setup/webhook/register`
- `POST /api/webhooks/kypcar`
- `GET /api/events/:eventId`

Exemplo de simulação:

```bash
curl -X POST http://localhost:3000/api/webhooks/kypcar \
  -H 'Content-Type: application/json' \
  -d '{"plate":"BRA2E19"}'
```

## Testes

```bash
npm test
```

Os testes focam nos casos de uso e mockam dependências externas, principalmente a integração HTTP/Kypcar.

Guia detalhado de validação: [TESTING.md](/var/www/html/kypcar/TESTING.md)

## Docker

Build:

```bash
docker build -t kypcar-exam-backend .
```

Run:

```bash
docker-compose up --build
```

## Esboço sugerido para a entrega

- Contexto do desafio e objetivo do sistema
- Arquitetura adotada e motivo da separação por camadas
- Estratégia para cumprir o limite de 60 segundos
- Estratégia de retry, refresh de token e fallback de datas
- Como executar localmente e com Docker
- Como registrar o webhook e validar o fluxo fim a fim
- Riscos conhecidos e próximos passos de produção
