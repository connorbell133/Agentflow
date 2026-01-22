export function ThemeScript() {
  // Safe usage: This is a static, controlled script for theme initialization
  // No user input is involved in this script generation
  const themeScript = `
    (function() {
      try {
        const theme = localStorage.getItem('theme');
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const activeTheme = theme || systemTheme;
        
        // Apply theme class immediately
        if (activeTheme === 'dark') {
          document.documentElement.classList.add('dark');
        }
        
        // Store theme info for hydration consistency
        window.__theme = activeTheme;
      } catch (e) {
        // Fail silently
      }
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeScript }}
      suppressHydrationWarning
    />
  );
}