namespace RoleManagement.Api.Modules.UserProfiles;

public static class EmployeeCodes
{
    public static string? Prefix(string? code)
    {
        var prefix = code?.Trim().ToUpperInvariant();
        if (string.IsNullOrEmpty(prefix) || prefix.Length is < 2 or > 10)
        {
            return null;
        }

        foreach (var character in prefix)
        {
            if (character is < 'A' or > 'Z')
            {
                return null;
            }
        }

        return prefix;
    }

    public static string Format(string prefix, int number)
    {
        return prefix + number.ToString("000");
    }

    public static bool TryRead(string prefix, string code, out int number)
    {
        number = 0;
        if (code.Length != prefix.Length + 3 || !code.StartsWith(prefix, StringComparison.Ordinal))
        {
            return false;
        }

        return int.TryParse(code.AsSpan(prefix.Length), out number) && number is >= 1 and <= 999;
    }
}
