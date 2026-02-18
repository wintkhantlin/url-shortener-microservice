FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o ip2geo main.go

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/ip2geo .
COPY --from=builder /app/db/GeoLite2-City.mmdb ./db/GeoLite2-City.mmdb

EXPOSE 50051

CMD ["./ip2geo"]
