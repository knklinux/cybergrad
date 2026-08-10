# Genera los iconos de CYBERGRAD con el avatar de Jimmy:
#   assets/favicon.png         (96x96, circular con anillo, fondo transparente)
#   assets/apple-touch-icon.png(180x180, avatar circular sobre fondo oscuro)
#   assets/cover-square.jpg    (1200x1200, portada cuadrada para og:image alternativo)
# Uso: powershell -NoProfile -ExecutionPolicy Bypass -File make-icons.ps1
Add-Type -AssemblyName System.Drawing

$verde = [System.Drawing.Color]::FromArgb(255, 51, 255, 102)
$cian  = [System.Drawing.Color]::FromArgb(255, 53, 224, 255)
$bg    = [System.Drawing.Color]::FromArgb(255, 5, 13, 10)
$grisO = [System.Drawing.Color]::FromArgb(255, 95, 138, 106)
$dark  = [System.Drawing.Color]::FromArgb(255, 4, 8, 10)
$imgSrc = [System.Drawing.Image]::FromFile((Join-Path $PSScriptRoot 'assets\jimmy-avatar.jpg'))

# Dibuja el avatar en círculo centrado con anillo y glow sobre un Graphics dado
function Draw-Avatar($g, $cx, $cy, $size, $ringColor, $ringWidth) {
    $x = $cx - $size / 2; $y = $cy - $size / 2
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse($x, $y, $size, $size)
    $g.SetClip($path)
    $g.DrawImage($script:imgSrc, $x, $y, $size, $size)
    $g.ResetClip()
    for ($i = 1; $i -le 5; $i++) {
        $penGlow = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(20, $ringColor.R, $ringColor.G, $ringColor.B), 5)
        $g.DrawEllipse($penGlow, $x - $i, $y - $i, $size + 2 * $i, $size + 2 * $i)
        $penGlow.Dispose()
    }
    $penBorde = New-Object System.Drawing.Pen($ringColor, $ringWidth)
    $g.DrawEllipse($penBorde, $x, $y, $size, $size)
    $path.Dispose(); $penBorde.Dispose()
}

# ---------- 1. Favicon (transparente) ----------
$f = New-Object System.Drawing.Bitmap(96, 96)
$gf = [System.Drawing.Graphics]::FromImage($f)
$gf.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
# fondo totalmente transparente
$gf.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))
Draw-Avatar $gf 48 48 84 $verde 4
$outFav = Join-Path $PSScriptRoot 'assets\favicon.png'
$gf.Dispose()
if (Test-Path $outFav) { Remove-Item $outFav -Force }
$f.Save($outFav, [System.Drawing.Imaging.ImageFormat]::Png)
$f.Dispose()
Write-Output ("Favicon: " + $outFav)

# ---------- 2. Apple touch icon (180x180, fondo oscuro) ----------
$a = New-Object System.Drawing.Bitmap(180, 180)
$ga = [System.Drawing.Graphics]::FromImage($a)
$ga.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$ga.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$ga.Clear($bg)
Draw-Avatar $ga 90 88 156 $cian 5
$fMini = New-Object System.Drawing.Font('Consolas', 13, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$bMini = New-Object System.Drawing.SolidBrush($grisO)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$rectMini = New-Object System.Drawing.RectangleF(0, 163, 180, 17)
$ga.DrawString('CYBERGRAD', $fMini, $bMini, $rectMini, $sf)
$outApple = Join-Path $PSScriptRoot 'assets\apple-touch-icon.png'
$ga.Dispose()
if (Test-Path $outApple) { Remove-Item $outApple -Force }
$a.Save($outApple, [System.Drawing.Imaging.ImageFormat]::Png)
$a.Dispose()
$fMini.Dispose(); $bMini.Dispose(); $sf.Dispose()
Write-Output ("Apple touch: " + $outApple)

# ---------- 3. Portada cuadrada (1200x1200) ----------
$W = 1200; $H = 1200
$b = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($b)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear($bg)

$penGrid = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(16, 51, 255, 102))
for ($x = 0; $x -lt $W; $x += 40) { $g.DrawLine($penGrid, $x, 0, $x, $H) }
for ($y = 0; $y -lt $H; $y += 40) { $g.DrawLine($penGrid, 0, $y, $W, $y) }

$lg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Rectangle(0, 0, $W, $H)),
    [System.Drawing.Color]::FromArgb(160, 0, 0, 0),
    [System.Drawing.Color]::FromArgb(0, 0, 0, 0),
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
$g.FillRectangle($lg, 0, 0, $W, $H)
$lg.Dispose()

# Título centrado con glow
$fTitulo = New-Object System.Drawing.Font('Segoe UI', 112, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fSub = New-Object System.Drawing.Font('Consolas', 26, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fPie = New-Object System.Drawing.Font('Consolas', 15, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$sfC = New-Object System.Drawing.StringFormat
$sfC.Alignment = [System.Drawing.StringAlignment]::Center

$rectTitulo = New-Object System.Drawing.RectangleF(0, 90, $W, 130)
$bGlow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(70, 51, 255, 102))
for ($dx = -3; $dx -le 3; $dx += 1) {
    for ($dy = -3; $dy -le 3; $dy += 1) {
        if ($dx -eq 0 -and $dy -eq 0) { continue }
        $g.TranslateTransform($dx, $dy)
        $g.DrawString('CYBERGRAD', $fTitulo, $bGlow, $rectTitulo, $sfC)
        $g.ResetTransform()
    }
}
$bVerde = New-Object System.Drawing.SolidBrush($verde)
$g.DrawString('CYBERGRAD', $fTitulo, $bVerde, $rectTitulo, $sfC)

$bCian = New-Object System.Drawing.SolidBrush($cian)
$rectSub = New-Object System.Drawing.RectangleF(0, 222, $W, 40)
$g.DrawString('S I M U L A D O R   D E   C A R R E R A   S O C', $fSub, $bCian, $rectSub, $sfC)

# Avatar grande centrado
Draw-Avatar $g 600 620 440 $cian 5

# Línea de terminal bajo el avatar
$fTerm = New-Object System.Drawing.Font('Consolas', 20, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$bTerm = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 158, 216, 171))
$rectTerm = New-Object System.Drawing.RectangleF(0, 880, $W, 34)
$g.DrawString('analista@acme:~$ bloquear phishing-tutorial.xyz   >   Indicador neutralizado', $fTerm, $bTerm, $rectTerm, $sfC)

# Pie
$bPie = New-Object System.Drawing.SolidBrush($grisO)
$yPie = $H - 60
$rectPie = New-Object System.Drawing.RectangleF(0, $yPie, $W, 26)
$g.DrawString('APRENDE CIBERSEGURIDAD DEFENSIVA JUGANDO   |   knklinux.github.io/cybergrad', $fPie, $bPie, $rectPie, $sfC)

$outSq = Join-Path $PSScriptRoot 'assets\cover-square.jpg'
$g.Dispose()
if (Test-Path $outSq) { Remove-Item $outSq -Force }
$b.Save($outSq, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$b.Dispose()
Write-Output ("Portada cuadrada: " + $outSq)

$imgSrc.Dispose()
