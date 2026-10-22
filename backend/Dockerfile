FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

ENV DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 \
    NUGET_XMLDOC_MODE=skip \
    DOTNET_GCHeapHardLimit=536870912

COPY RoleManagement.Api.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_GCHeapHardLimit=134217728 \
    DOTNET_GCConserveMemory=9 \
    DOTNET_gcServer=0 \
    DOTNET_EnableDiagnostics=0
EXPOSE 8080

COPY --from=build /app/publish ./
ENTRYPOINT ["dotnet", "RoleManagement.Api.dll"]
