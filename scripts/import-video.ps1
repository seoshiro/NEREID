$ErrorActionPreference = 'Stop'
$commit = 'eecda179f29848892eadc55d1dc7535ab8f1a2ed'
$repo = 'seoshiro/NEREID'
$root = Split-Path $PSScriptRoot -Parent
$destination = Join-Path $root 'assets/video'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$treeRaw = gh api "repos/$repo/git/trees/$commit`?recursive=1"
if ($LASTEXITCODE -ne 0) { throw 'Cannot read video commit' }
$tree = $treeRaw | ConvertFrom-Json
$items = $tree.tree | Where-Object { $_.type -eq 'blob' -and $_.path -match '^public/media/((manta|orca|medusa)\.(mp4|webp)|(manifest|provenance)\.json)$' }
if (@($items).Count -ne 8) { throw 'Expected exactly eight approved media/provenance files' }
$checks = foreach ($item in $items) {
  $blobRaw = gh api "repos/$repo/git/blobs/$($item.sha)"
  if ($LASTEXITCODE -ne 0) { throw "Cannot read blob $($item.path)" }
  $blob = $blobRaw | ConvertFrom-Json
  if ($blob.encoding -ne 'base64') { throw 'Unexpected blob encoding' }
  $bytes = [Convert]::FromBase64String($blob.content)
  $header = [Text.Encoding]::UTF8.GetBytes("blob $($bytes.Length)`0")
  $gitBytes = [byte[]]::new($header.Length + $bytes.Length)
  [Array]::Copy($header, 0, $gitBytes, 0, $header.Length)
  [Array]::Copy($bytes, 0, $gitBytes, $header.Length, $bytes.Length)
  $gitSha = [Convert]::ToHexString([Security.Cryptography.SHA1]::HashData($gitBytes)).ToLowerInvariant()
  if ($gitSha -ne $item.sha -or $bytes.Length -ne $item.size) { throw "Integrity failure: $($item.path)" }
  $name = [IO.Path]::GetFileName($item.path)
  $target = Join-Path $destination $name
  [IO.File]::WriteAllBytes($target, $bytes)
  [pscustomobject]@{ file = "assets/video/$name"; bytes = $bytes.Length; gitBlobSha1 = $gitSha; sha256 = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() }
}
[pscustomobject]@{ repository=$repo;commit=$commit;verified=$true;files=@($checks) } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $root 'assets/video-transfer-verification.json') -Encoding utf8
$checks | Select-Object file,bytes,sha256 | Format-Table -AutoSize
