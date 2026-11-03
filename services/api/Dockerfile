FROM golang:1.26.10-bookworm@sha256:23ce71337b726608afb1bc00986e630a05034a87a87ea1fc2cd1ae5cf33387eb AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
ARG VERSION=dev
ARG COMMIT=unknown
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w -X main.version=${VERSION} -X main.commit=${COMMIT}" -o /out/irespond-api ./cmd/server && \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/irespond-migrate ./cmd/migrate && \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/irespond-outbox-publisher ./cmd/outbox-publisher

FROM gcr.io/distroless/static-debian12:nonroot@sha256:d093aa3e30dbadd3efe1310db061a14da60299baff8450a17fe0ccc514a16639
ARG COMMIT=unknown
LABEL org.opencontainers.image.revision=$COMMIT
WORKDIR /app
COPY --from=build /out/irespond-api /usr/local/bin/irespond-api
COPY --from=build /out/irespond-migrate /usr/local/bin/irespond-migrate
COPY --from=build /out/irespond-outbox-publisher /usr/local/bin/irespond-outbox-publisher
COPY migrations /app/migrations
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/irespond-api"]
