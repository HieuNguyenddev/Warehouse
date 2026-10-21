namespace RoleManagement.Api.Modules.Storage;

public static class FileSignatures
{
    public static readonly HashSet<string> ImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".png",
        ".webp",
        ".gif",
    };

    public static readonly HashSet<string> FileExtensions = new(ImageExtensions, StringComparer.OrdinalIgnoreCase)
    {
        ".pdf",
        ".txt",
        ".docx",
        ".xlsx",
    };

    public static readonly Dictionary<string, string> ContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        [".jpg"] = "image/jpeg",
        [".png"] = "image/png",
        [".webp"] = "image/webp",
        [".gif"] = "image/gif",
        [".pdf"] = "application/pdf",
        [".txt"] = "text/plain",
        [".docx"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        [".xlsx"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };

    public static string? DetectExtension(byte[] bytes, string? declaredExtension, bool imagesOnly)
    {
        var image = DetectImage(bytes);
        if (image != null)
        {
            return image;
        }

        if (imagesOnly)
        {
            return null;
        }

        if (bytes.Length >= 5
            && bytes[0] == (byte)'%'
            && bytes[1] == (byte)'P'
            && bytes[2] == (byte)'D'
            && bytes[3] == (byte)'F'
            && bytes[4] == (byte)'-')
        {
            return ".pdf";
        }

        if (declaredExtension != null
            && bytes.Length >= 4
            && bytes[0] == 0x50 && bytes[1] == 0x4B && bytes[2] == 0x03 && bytes[3] == 0x04
            && (declaredExtension.Equals(".docx", StringComparison.OrdinalIgnoreCase)
                || declaredExtension.Equals(".xlsx", StringComparison.OrdinalIgnoreCase)))
        {
            return declaredExtension.ToLowerInvariant();
        }

        if (declaredExtension != null
            && declaredExtension.Equals(".txt", StringComparison.OrdinalIgnoreCase)
            && IsText(bytes))
        {
            return ".txt";
        }

        return null;
    }

    public static string SafeFileName(string? name, string extension)
    {
        var fileName = Path.GetFileName(name ?? "");
        fileName = string.Concat(fileName.Where(character => !char.IsControl(character))).Trim();
        if (fileName.Length == 0)
        {
            fileName = "tep" + extension;
        }

        if (!fileName.EndsWith(extension, StringComparison.OrdinalIgnoreCase))
        {
            fileName += extension;
        }

        return fileName.Length <= 120 ? fileName : fileName[^120..];
    }

    private static string? DetectImage(byte[] bytes)
    {
        if (bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
        {
            return ".jpg";
        }

        if (bytes.Length >= 8 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47)
        {
            return ".png";
        }

        if (bytes.Length >= 6 && bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x38)
        {
            return ".gif";
        }

        if (bytes.Length >= 12
            && bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46
            && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50)
        {
            return ".webp";
        }

        return null;
    }

    private static bool IsText(byte[] bytes)
    {
        if (bytes.Length == 0 || bytes.Length > 8 * 1024 * 1024)
        {
            return false;
        }

        return !bytes.Contains((byte)0);
    }
}
