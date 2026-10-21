import path from 'node:path';

export function hiddenTaskLauncher(bootstrap, root) {
  const quote=value=>"'"+value.replaceAll("'","''")+"'";
  const args='"'+path.join(bootstrap,'bootstrap.mjs')+'" "'+root+'"';
  return "$ErrorActionPreference='Stop'\r\n$process=Start-Process -FilePath "+quote(path.join(bootstrap,'node.exe'))+' -ArgumentList '+quote(args)+' -WorkingDirectory '+quote(bootstrap)+' -WindowStyle Hidden -PassThru\r\n$null=$process.Handle\r\n$process.WaitForExit()\r\nexit $process.ExitCode\r\n';
}

export function taskAction(bootstrap) {
  return {execute:path.join(process.env.SystemRoot ?? 'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe'),arguments:'-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy RemoteSigned -File "'+path.join(bootstrap,'launch-hidden.ps1')+'"'};
}
