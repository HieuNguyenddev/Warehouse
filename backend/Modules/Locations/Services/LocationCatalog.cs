using System.Globalization;
using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using RoleManagement.Api.Modules.Locations.DTOs;

namespace RoleManagement.Api.Modules.Locations.Services;

public class LocationCatalog
{
    private static readonly TimeSpan CacheFor = TimeSpan.FromHours(12);
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly IHttpClientFactory _http;
    private readonly IMemoryCache _cache;

    public LocationCatalog(IHttpClientFactory http, IMemoryCache cache)
    {
        _http = http;
        _cache = cache;
    }

    public async Task<IReadOnlyList<AdminUnitResponse>> GetProvincesAsync(CancellationToken cancellationToken)
    {
        return await _cache.GetOrCreateAsync("locations:v2:provinces", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheFor;
            var units = await ReadAsync<List<RemoteUnit>>("api/v2/?depth=1", cancellationToken);
            return Map(units);
        }) ?? [];
    }

    public async Task<IReadOnlyList<AdminUnitResponse>?> GetWardsAsync(int provinceCode, CancellationToken cancellationToken)
    {
        var key = $"locations:v2:wards:{provinceCode}";
        if (_cache.TryGetValue(key, out IReadOnlyList<AdminUnitResponse>? cached) && cached != null)
        {
            return cached;
        }

        var province = await ReadAsync<RemoteUnit>($"api/v2/p/{provinceCode}?depth=2", cancellationToken);
        if (province == null)
        {
            return null;
        }

        var wards = Map(province.Wards);
        _cache.Set(key, wards, CacheFor);
        return wards;
    }

    private async Task<T?> ReadAsync<T>(string path, CancellationToken cancellationToken)
    {
        var client = _http.CreateClient("provinces");
        using var response = await client.GetAsync(path, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return default;
        }

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<T>(JsonOptions, cancellationToken);
    }

    private static IReadOnlyList<AdminUnitResponse> Map(IEnumerable<RemoteUnit>? units)
    {
        if (units == null)
        {
            return [];
        }

        return units
            .Where(unit => unit.Code > 0 && !string.IsNullOrWhiteSpace(unit.Name))
            .Select(unit => new AdminUnitResponse(
                unit.Code.ToString(CultureInfo.InvariantCulture),
                unit.Name.Trim()))
            .ToList();
    }

    private sealed class RemoteUnit
    {
        public string Name { get; set; } = "";

        public int Code { get; set; }

        public List<RemoteUnit>? Wards { get; set; }
    }
}
