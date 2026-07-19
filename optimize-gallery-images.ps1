$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataPath = Join-Path $root "gallery-data.js"
$outRoot = Join-Path $root "optimized-assets"
$maxSide = 1800
$quality = 84L

if (-not (Test-Path -LiteralPath $outRoot)) {
  New-Item -ItemType Directory -Path $outRoot | Out-Null
}

$data = Get-Content -LiteralPath $dataPath -Raw
$srcMatches = [regex]::Matches($data, '"src"\s*:\s*"([^"]+)"')
$imageExt = @(".jpg", ".jpeg", ".png")
$sources = New-Object System.Collections.Generic.List[string]

foreach ($match in $srcMatches) {
  $src = $match.Groups[1].Value
  if ($src -like "optimized-assets/*") { continue }
  $ext = [System.IO.Path]::GetExtension($src).ToLowerInvariant()
  if ($imageExt -contains $ext) {
    $sources.Add($src)
  }
}

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq "image/jpeg" } |
  Select-Object -First 1

$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters 1
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality,
  $quality
)

$converted = @{}
$totalOriginal = 0L
$totalOptimized = 0L
$processed = 0

function Test-NearlySolidImage($path) {
  $img = [System.Drawing.Image]::FromFile($path)
  try {
    $bmp = New-Object System.Drawing.Bitmap $img, 16, 16
    try {
      $sum = 0.0
      $values = New-Object System.Collections.Generic.List[double]
      for ($x = 0; $x -lt 16; $x++) {
        for ($y = 0; $y -lt 16; $y++) {
          $c = $bmp.GetPixel($x, $y)
          $b = ($c.R + $c.G + $c.B) / 3
          $values.Add($b)
          $sum += $b
        }
      }
      $avg = $sum / $values.Count
      $variance = 0.0
      foreach ($value in $values) {
        $variance += [Math]::Pow($value - $avg, 2)
      }
      $std = [Math]::Sqrt($variance / $values.Count)
      return (($avg -gt 245 -or $avg -lt 10) -and $std -lt 8)
    } finally {
      $bmp.Dispose()
    }
  } finally {
    $img.Dispose()
  }
}

foreach ($src in ($sources | Sort-Object -Unique)) {
  $inputPath = Join-Path $root $src
  if (-not (Test-Path -LiteralPath $inputPath)) {
    Write-Warning "Missing source: $src"
    continue
  }

  $srcDir = [System.IO.Path]::GetDirectoryName($src)
  $srcBase = [System.IO.Path]::GetFileNameWithoutExtension($src)
  $relativeNoExt = if ([string]::IsNullOrWhiteSpace($srcDir)) { $srcBase } else { Join-Path $srcDir $srcBase }
  $outRelative = ($relativeNoExt + ".jpg").Replace("\", "/")
  $outputPath = Join-Path $outRoot $outRelative
  $outputDir = Split-Path -Parent $outputPath
  if (-not (Test-Path -LiteralPath $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
  }

  try {
    $image = [System.Drawing.Image]::FromFile($inputPath)
  } catch {
    Write-Warning "Could not decode: $src"
    continue
  }
  try {
    $scale = [Math]::Min(1, $maxSide / [Math]::Max($image.Width, $image.Height))
    $newWidth = [Math]::Max(1, [int][Math]::Round($image.Width * $scale))
    $newHeight = [Math]::Max(1, [int][Math]::Round($image.Height * $scale))

    $bitmap = New-Object System.Drawing.Bitmap $newWidth, $newHeight
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($image, 0, 0, $newWidth, $newHeight)
      } finally {
        $graphics.Dispose()
      }

      $bitmap.Save($outputPath, $jpegCodec, $encoderParams)
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $image.Dispose()
  }

  $originalSize = (Get-Item -LiteralPath $inputPath).Length
  $optimizedSize = (Get-Item -LiteralPath $outputPath).Length
  if (Test-NearlySolidImage $outputPath) {
    Remove-Item -LiteralPath $outputPath -Force
    Write-Warning "Skipped suspicious solid output: $src"
    continue
  }
  $totalOriginal += $originalSize
  $totalOptimized += $optimizedSize
  $processed += 1
  $converted[$src] = "optimized-assets/$outRelative"
}

$updatedData = $data
foreach ($src in ($converted.Keys | Sort-Object { $_.Length } -Descending)) {
  $updatedData = $updatedData.Replace("""src"":  ""$src""", """src"":  ""$($converted[$src])""")
}
Set-Content -LiteralPath $dataPath -Value $updatedData -Encoding UTF8

$saved = if ($totalOriginal -gt 0) { 100 - [Math]::Round(($totalOptimized / $totalOriginal) * 100, 1) } else { 0 }
Write-Host "Processed $processed images"
Write-Host "Original:  $([Math]::Round($totalOriginal / 1MB, 2)) MB"
Write-Host "Optimized: $([Math]::Round($totalOptimized / 1MB, 2)) MB"
Write-Host "Saved:     $saved%"
