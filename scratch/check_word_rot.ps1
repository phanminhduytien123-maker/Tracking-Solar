try {
    $word = [System.Runtime.InteropServices.Marshal]::GetActiveObject("Word.Application")
    Write-Host ("Word connected! Documents count: " + $word.Documents.Count)
    foreach ($d in $word.Documents) {
        Write-Host ("Document: " + $d.Name + ", Saved=" + $d.Saved + ", Path=" + $d.FullName)
    }
} catch {
    Write-Host ("Error: " + $_.Exception.Message)
}

