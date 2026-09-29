Add-Type -AssemblyName System.Drawing

$tvAssetDirectory = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets'
New-Item -ItemType Directory -Path $tvAssetDirectory -Force | Out-Null
$tvOutput = Join-Path $tvAssetDirectory 'tv-banner.png'

$tvBitmap = [System.Drawing.Bitmap]::new(320, 180)
$tvCanvas = [System.Drawing.Graphics]::FromImage($tvBitmap)
$tvBackground = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(12, 27, 40))
$tvGold = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(216, 183, 126))
$tvWhite = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 249, 237))
$tvLine = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(216, 183, 126), 3)
$tvTitleFont = [System.Drawing.Font]::new('Segoe UI', 31, [System.Drawing.FontStyle]::Bold)
$tvCaptionFont = [System.Drawing.Font]::new('Segoe UI', 12, [System.Drawing.FontStyle]::Regular)

try {
  $tvCanvas.FillRectangle($tvBackground, 0, 0, 320, 180)
  $tvCanvas.DrawLine($tvLine, 28, 123, 292, 123)
  $tvCanvas.DrawString('HOTEL', $tvTitleFont, $tvWhite, 25, 35)
  $tvCanvas.DrawString('DISPLAY', $tvTitleFont, $tvGold, 25, 73)
  $tvCanvas.DrawString('Pantallas inteligentes', $tvCaptionFont, $tvWhite, 28, 135)
  $tvBitmap.Save($tvOutput, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $tvCanvas.Dispose()
  $tvBitmap.Dispose()
  $tvBackground.Dispose()
  $tvGold.Dispose()
  $tvWhite.Dispose()
  $tvLine.Dispose()
  $tvTitleFont.Dispose()
  $tvCaptionFont.Dispose()
}
