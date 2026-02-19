FROM golang:1.25-alpine AS builder

WORKDIR /app

# Copy the dependency modules first
COPY services/ip2geo /app/services/ip2geo
COPY services/user-agent /app/services/user-agent

# Set workdir to where we want to build
WORKDIR /app/services/analytics

# Copy main module files
COPY services/analytics/go.mod services/analytics/go.sum ./

RUN go mod download

# Copy the rest of the source code
# NOTE: This requires the build context to be the project root
COPY services/analytics/ .

RUN go build -o analytics main.go

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/services/analytics/analytics .

EXPOSE 8080

CMD ["./analytics"]
