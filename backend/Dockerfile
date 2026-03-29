# ============================================================
# DocuMind - .NET 9 Backend API
# Multi-stage build for production deployment
# ============================================================

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY DocuMind.Api/DocuMind.Api.csproj DocuMind.Api/
RUN dotnet restore DocuMind.Api/DocuMind.Api.csproj

COPY . .
RUN dotnet publish DocuMind.Api/DocuMind.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .

# Install curl for healthchecks and create data directories
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/data /app/uploads \
    && adduser --disabled-password --gecos "" --uid 1001 appuser \
    && chown -R appuser:appuser /app

USER appuser

ENV ASPNETCORE_URLS=http://+:5001
EXPOSE 5001

ENTRYPOINT ["dotnet", "DocuMind.Api.dll"]
