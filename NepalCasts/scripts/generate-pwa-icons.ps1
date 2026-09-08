# Generate high-resolution PWA, Desktop App, and Browser icons from public/logo.png
[Reflection.Assembly]::LoadWithPartialName('System.Drawing') | Out-Null
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$rootDir = Split-Path -Parent $scriptDir
$publicDir = Join-Path $rootDir "public"
$logoPath = Join-Path $publicDir "logo.png"

if (-not (Test-Path $logoPath)) {
    Write-Error "Could not find $logoPath"
    exit 1
}

$src = New-Object System.Drawing.Bitmap($logoPath)
$srcRect = New-Object System.Drawing.Rectangle 310, 220, 924, 604
$brandDark = [System.Drawing.ColorTranslator]::FromHtml('#050508')
$borderColor = [System.Drawing.ColorTranslator]::FromHtml('#2A2215')

function Create-SquircleIcon([int]$size, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $inset = [Math]::Max(1.0, $size * (16.0 / 512.0))
    $innerSize = $size - (2.0 * $inset)
    $r = $innerSize * (100.0 / 480.0)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($inset, $inset, $r, $r, 180, 90)
    $path.AddArc($inset + $innerSize - $r, $inset, $r, $r, 270, 90)
    $path.AddArc($inset + $innerSize - $r, $inset + $innerSize - $r, $r, $r, 0, 90)
    $path.AddArc($inset, $inset + $innerSize - $r, $r, $r, 90, 90)
    $path.CloseFigure()

    $brush = New-Object System.Drawing.SolidBrush $brandDark
    $g.FillPath($brush, $path)
    $brush.Dispose()

    $borderW = [Math]::Max(1.0, $size * (4.0 / 512.0))
    $pen = New-Object System.Drawing.Pen $borderColor, $borderW
    $g.DrawPath($pen, $path)
    $pen.Dispose()

    $availW = $innerSize * 0.76
    $availH = $innerSize * 0.76
    $scale = [Math]::Min($availW / $srcRect.Width, $availH / $srcRect.Height)
    $destW = [int]($srcRect.Width * $scale)
    $destH = [int]($srcRect.Height * $scale)
    $destX = [int](($size - $destW) / 2)
    $destY = [int](($size - $destH) / 2)

    $destRect = New-Object System.Drawing.Rectangle $destX, $destY, $destW, $destH
    $g.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host ("Generated: " + $outPath)
}

function Create-SolidIcon([int]$size, [double]$contentScale, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear($brandDark)

    $availW = $size * $contentScale
    $availH = $size * $contentScale
    $scale = [Math]::Min($availW / $srcRect.Width, $availH / $srcRect.Height)
    $destW = [int]($srcRect.Width * $scale)
    $destH = [int]($srcRect.Height * $scale)
    $destX = [int](($size - $destW) / 2)
    $destY = [int](($size - $destH) / 2)

    $destRect = New-Object System.Drawing.Rectangle $destX, $destY, $destW, $destH
    $g.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host ("Generated: " + $outPath)
}

Create-SquircleIcon 512 (Join-Path $publicDir "icon-512.png")
Create-SquircleIcon 192 (Join-Path $publicDir "icon-192.png")
Create-SolidIcon 512 0.70 (Join-Path $publicDir "icon-maskable-512.png")
Create-SolidIcon 192 0.70 (Join-Path $publicDir "icon-maskable-192.png")
Create-SolidIcon 180 0.72 (Join-Path $publicDir "apple-touch-icon.png")
Create-SquircleIcon 32 (Join-Path $publicDir "favicon-32x32.png")
Create-SquircleIcon 16 (Join-Path $publicDir "favicon-16x16.png")

$src.Dispose()
Write-Host "All PWA icon assets generated successfully."
