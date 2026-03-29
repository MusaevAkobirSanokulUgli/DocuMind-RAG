using DocuMind.Api.Data;
using DocuMind.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// RAG Engine HTTP client
builder.Services.AddHttpClient<RagEngineClient>(client =>
{
    var baseUrl = builder.Configuration["RagEngine:BaseUrl"] ?? "http://localhost:8000";
    client.BaseAddress = new Uri(baseUrl);
    client.Timeout = TimeSpan.FromMinutes(5); // Document processing can take time
});

// Application services
builder.Services.AddScoped<DocumentProcessingService>();
builder.Services.AddScoped<ChatService>();

// CORS
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3100", "http://localhost:8081" };
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "DocuMind API", Version = "v1" });
});

var app = builder.Build();

// Auto-create/migrate database
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

// Create upload directory
var uploadDir = builder.Configuration["Storage:UploadDir"] ?? "./uploads";
Directory.CreateDirectory(uploadDir);

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors();
app.MapControllers();

app.Run();
