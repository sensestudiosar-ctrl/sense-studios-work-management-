Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='node_modules*' OR Name='python.exe'" | ForEach-Object {
  $short = if ($_.CommandLine.Length -gt 220) { $_.CommandLine.Substring(0,220) } else { $_.CommandLine }
  "$($_.ProcessId)  $($_.Name)  $short"
}
