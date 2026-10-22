using RoleManagement.Api.Modules.WorkExperiences.DTOs;

namespace RoleManagement.Api.Modules.WorkExperiences.Services;

public enum WorkExperienceError
{
    None,
    NotFound,
    Invalid,
}

public class WorkExperienceResult
{
    public WorkExperienceResponse? Experience { get; init; }

    public WorkExperienceError Error { get; init; }

    public string? Message { get; init; }

    public bool Succeeded => Error == WorkExperienceError.None;

    public static WorkExperienceResult Ok(WorkExperienceResponse? experience = null)
    {
        return new WorkExperienceResult { Experience = experience };
    }

    public static WorkExperienceResult NotFound(string message)
    {
        return new WorkExperienceResult { Error = WorkExperienceError.NotFound, Message = message };
    }

    public static WorkExperienceResult Invalid(string message)
    {
        return new WorkExperienceResult { Error = WorkExperienceError.Invalid, Message = message };
    }
}
