FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o analytics main.go

RUN wget -O GeoLite2-City.mmdb https://git.io/GeoLite2-City.mmdb

RUN mkdir -p geo2ip

RUN cp GeoLite2-City.mmdb geo2ip/GeoLite2-City.mmdb


FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/analytics .

EXPOSE 8080

CMD ["./analytics"]
