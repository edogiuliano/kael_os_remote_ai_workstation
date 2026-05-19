import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import type { RuntimePaths } from "../runtime/paths.js";

const execFileAsync = promisify(execFile);

export async function captureWindowsScreenshot(paths: RuntimePaths): Promise<string> {
  const output = path.join(paths.logs, `screenshot-${Date.now()}.png`);
  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save('${output.replaceAll("'", "''")}', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
`;

  await execFileAsync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    windowsHide: true,
    timeout: 10000
  });
  return output;
}

