# Genera la portada Open Graph (1200x630) de CYBERGRAD
# Uso: powershell -NoProfile -ExecutionPolicy Bypass -File make-cover.ps1
Add-Type -AssemblyName System.Drawing

$W = 1200; $H = 630
$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$bg   = [System.Drawing.Color]::FromArgb(255, 5, 13, 10)
$verde= [System.Drawing.Color]::FromArgb(255, 51, 255, 102)
$cian = [System.Drawing.Color]::FromArgb(255, 53, 224, 255)
$gris = [System.Drawing.Color]::FromArgb(255, 158, 216, 171)
$grisO= [System.Drawing.Color]::FromArgb(255, 95, 138, 106)
$dark = [System.Drawing.Color]::FromArgb(255, 4, 8, 10)

$g.Clear($bg)

# Rejilla sutil de fondo
$penGrid = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(16, 51, 255, 102))
for ($x = 0; $x -lt $W; $x += 40) { $g.DrawLine($penGrid, $x, 0, $x, $H) }
for ($y = 0; $y -lt $H; $y += 40) { $g.DrawLine($penGrid, 0, $y, $W, $y) }

# Vineta superior (degradado oscuro) para dar profundidad
$lg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Rectangle(0, 0, $W, $H)),
    [System.Drawing.Color]::FromArgb(140, 0, 0, 0),
    [System.Drawing.Color]::FromArgb(0, 0, 0, 0),
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical)
$g.FillRectangle($lg, 0, 0, $W, $H)
$lg.Dispose()

# --- Avatar de Jimmy (derecha) ---
$avatarSize = 300
$ax = $W - $avatarSize - 90
$ay = 70
$img = [System.Drawing.Image]::FromFile((Join-Path $PSScriptRoot 'assets\jimmy-avatar.jpg'))
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddEllipse($ax, $ay, $avatarSize, $avatarSize)
$g.SetClip($path)
$g.DrawImage($img, $ax, $ay, $avatarSize, $avatarSize)
$g.ResetClip()
# borde + glow
$penBorde = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 53, 224, 255), 4)
$g.DrawEllipse($penBorde, $ax, $ay, $avatarSize, $avatarSize)
for ($i = 1; $i -le 5; $i++) {
    $penGlow = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(18, 53, 224, 255), 6)
    $g.DrawEllipse($penGlow, $ax - $i, $ay - $i, $avatarSize + 2 * $i, $avatarSize + 2 * $i)
    $penGlow.Dispose()
}
$img.Dispose(); $path.Dispose(); $penBorde.Dispose()

# --- Titulo ---
$fTitulo = New-Object System.Drawing.Font('Segoe UI', 84, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fSub    = New-Object System.Drawing.Font('Consolas', 24, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fTerm   = New-Object System.Drawing.Font('Consolas', 17, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$fPie    = New-Object System.Drawing.Font('Consolas', 15, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)

$tx = 70
$ty = 48

# glow del titulo
$bGlow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(70, 51, 255, 102))
for ($dx = -3; $dx -le 3; $dx += 1) {
    for ($dy = -3; $dy -le 3; $dy += 1) {
        if ($dx -eq 0 -and $dy -eq 0) { continue }
        $g.DrawString('CYBERGRAD', $fTitulo, $bGlow, $tx + $dx, $ty + $dy)
    }
}
$bVerde = New-Object System.Drawing.SolidBrush($verde)
$g.DrawString('CYBERGRAD', $fTitulo, $bVerde, $tx, $ty)

# subtitulo (espaciado manual)
$bCian = New-Object System.Drawing.SolidBrush($cian)
$sub = 'S I M U L A D O R   D E   C A R R E R A   S O C'
$g.DrawString($sub, $fSub, $bCian, $tx, $ty + 110)

# --- Ventana de terminal simulada ---
$termX = 70; $termY = 310; $termW = 700; $termH = 200
$g.FillRectangle((New-Object System.Drawing.SolidBrush($dark)), $termX, $termY, $termW, $termH)
$g.DrawRectangle((New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 31, 107, 56), 2)), $termX, $termY, $termW, $termH)

# barra de titulo de la ventana
$g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 14, 26, 20))), $termX + 1, $termY + 1, $termW - 2, 26)
$bGris = New-Object System.Drawing.SolidBrush($grisO)
$g.DrawString('  terminal - analista@acme', $fPie, $bGris, $termX + 6, $termY + 3)

$lineas = @(
    'analista@acme:~$ mail',
    '1. [SOSPECHOSO] soporte@phishing-tutorial.xyz - "Factura pendiente"',
    'analista@acme:~$ alertas',
    '[MEDIUM] ALT-T1 - SPF fail en dominio no autenticado',
    'analista@acme:~$ bloquear phishing-tutorial.xyz',
    '> Indicador neutralizado. Buen trabajo, analista.'
)
$bTerm = New-Object System.Drawing.SolidBrush($gris)
$bOk = New-Object System.Drawing.SolidBrush($verde)
$y = $termY + 38
foreach ($l in $lineas) {
    if ($l -like '>*') {
        $g.DrawString($l, $fTerm, $bOk, $termX + 16, $y)
    } else {
        $g.DrawString($l, $fTerm, $bTerm, $termX + 16, $y)
    }
    $y += 26
}

# --- Pie ---
$bPie = New-Object System.Drawing.SolidBrush($grisO)
$pie = 'APRENDE CIBERSEGURIDAD DEFENSIVA JUGANDO   |   knklinux.github.io/cybergrad'
$g.DrawString($pie, $fPie, $bPie, $tx, $H - 52)

$out = Join-Path $PSScriptRoot 'assets\cover.jpg'
# Libera el contexto gráfico antes de guardar y evita el error genérico de GDI+
$g.Dispose()
if (Test-Path $out) { Remove-Item $out -Force }
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Jpeg)

$fTitulo.Dispose(); $fSub.Dispose(); $fTerm.Dispose(); $fPie.Dispose()
$bGlow.Dispose(); $bVerde.Dispose(); $bCian.Dispose(); $bGris.Dispose(); $bPie.Dispose(); $bTerm.Dispose(); $bOk.Dispose()
$penGrid.Dispose(); $g.Dispose(); $bmp.Dispose()

Write-Output ("Portada generada: " + $out)
