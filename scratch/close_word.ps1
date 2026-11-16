$p = Get-Process -Id 21664 -ErrorAction SilentlyContinue
if ($p) {
    $res = $p.CloseMainWindow()
    Write-Host ("CloseMainWindow returned: " + $res)
} else {
    Write-Host "No process 21664"
}

