using RoleManagement.Api.Modules.Qualifications.DTOs;

namespace RoleManagement.Api.Modules.Qualifications.Services;

public enum QualificationError
{
    None,
    NotFound,
    Invalid,
    DuplicateNumber,
}

public class QualificationResult
{
    public QualificationResponse? Qualification { get; init; }

    public QualificationError Error { get; init; }

    public string? Message { get; init; }

    public bool Succeeded => Error == QualificationError.None;

    public static QualificationResult Ok(QualificationResponse? qualification = null)
    {
        return new QualificationResult { Qualification = qualification };
    }

    public static QualificationResult NotFound(string message)
    {
        return new QualificationResult { Error = QualificationError.NotFound, Message = message };
    }

    public static QualificationResult Invalid(string message)
    {
        return new QualificationResult { Error = QualificationError.Invalid, Message = message };
    }

    public static QualificationResult DuplicateNumber(string message)
    {
        return new QualificationResult { Error = QualificationError.DuplicateNumber, Message = message };
    }
}
