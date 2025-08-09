WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

WebApplication app = builder.Build();
app.UseStaticFiles();
app.UseDefaultFiles();
app.MapGet("/", () => "Splashcat is running!");
app.Run();
