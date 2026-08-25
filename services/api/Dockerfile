FROM golang:1.24-bookworm AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
ARG VERSION=dev
ARG COMMIT=unknown
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w -X main.version=${VERSION} -X main.commit=${COMMIT}" -o /out/irespond-api ./cmd/server && \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/irespond-migrate ./cmd/migrate

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=build /out/irespond-api /usr/local/bin/irespond-api
COPY --from=build /out/irespond-migrate /usr/local/bin/irespond-migrate
COPY migrations /app/migrations
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/irespond-api"]
