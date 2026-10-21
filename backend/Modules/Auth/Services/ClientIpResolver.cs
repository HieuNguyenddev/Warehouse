using System.Net;
using System.Net.Sockets;

namespace RoleManagement.Api.Modules.Auth.Services;

public static class ClientIpResolver
{
    public static string? Resolve(HttpContext http)
    {
        var candidates = new List<string?>();
        candidates.Add(http.Request.Headers["X-Real-IP"].FirstOrDefault());

        var forwarded = http.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
        {
            var hops = forwarded.Split(',');
            for (var index = hops.Length - 1; index >= 0; index--)
            {
                candidates.Add(hops[index]);
            }
        }

        candidates.Add(http.Connection.RemoteIpAddress?.ToString());

        string? fallback = null;
        foreach (var candidate in candidates)
        {
            var ip = Normalize(candidate);
            if (ip == null)
            {
                continue;
            }

            if (!IsPrivateOrLoopback(ip))
            {
                return ip;
            }

            fallback ??= ip;
        }

        return fallback;
    }

    private static string? Normalize(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var text = raw.Trim().Trim('"');
        if (text.Length == 0 || text.Equals("unknown", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        if (text.StartsWith('['))
        {
            var end = text.IndexOf(']');
            if (end > 1)
            {
                text = text[1..end];
            }
        }
        else if (text.Count(character => character == ':') == 1 && text.Contains('.'))
        {
            text = text[..text.IndexOf(':')];
        }

        if (!IPAddress.TryParse(text, out var address))
        {
            return null;
        }

        if (address.IsIPv4MappedToIPv6)
        {
            address = address.MapToIPv4();
        }

        if (address.Equals(IPAddress.IPv6Loopback))
        {
            return "127.0.0.1";
        }

        var value = address.ToString();
        return value.Length <= 45 ? value : null;
    }

    private static bool IsPrivateOrLoopback(string ip)
    {
        if (!IPAddress.TryParse(ip, out var address))
        {
            return true;
        }

        if (IPAddress.IsLoopback(address))
        {
            return true;
        }

        var bytes = address.GetAddressBytes();
        if (address.AddressFamily == AddressFamily.InterNetwork)
        {
            return bytes[0] == 10
                || bytes[0] == 127
                || (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31)
                || (bytes[0] == 192 && bytes[1] == 168)
                || (bytes[0] == 169 && bytes[1] == 254);
        }

        if (address.AddressFamily == AddressFamily.InterNetworkV6)
        {
            return address.IsIPv6LinkLocal || (bytes[0] & 0xfe) == 0xfc;
        }

        return false;
    }
}
