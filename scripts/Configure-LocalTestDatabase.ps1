[CmdletBinding()]
param(
    [string]$AdminUser = "postgres",

    [string]$CredentialFile = (
        Join-Path $env:LOCALAPPDATA `
            "PerovskiteWorkflow\test-database.credential.clixml"
    )
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Accept any installed major version (17/18/19, ...) and prefer the newest.
# Installation folders are named "17"/"18"/... — [version]::TryParse rejects
# a bare major number, so normalize it to a two-part version before parsing.
$postgresRoot = Join-Path $env:ProgramFiles "PostgreSQL"
$psqlDir = Get-ChildItem -LiteralPath $postgresRoot -Directory -ErrorAction SilentlyContinue |
    Where-Object {
        $version = $null
        $dirVersion = $null
        $name = $_.Name
        $isVersionDir = (
            [version]::TryParse($name, [ref]$version) -or
            ([regex]::IsMatch($name, '^\d+$') -and [version]::TryParse("$name.0", [ref]$dirVersion))
        )
        (Test-Path -LiteralPath (Join-Path $_.FullName "bin\psql.exe")) -and $isVersionDir
    } |
    Sort-Object {
        $v = $null
        $name = $_.Name
        if (-not [version]::TryParse($name, [ref]$v)) {
            [void][version]::TryParse("$name.0", [ref]$v)
        }
        $v
    } -Descending |
    Select-Object -First 1
if ($null -eq $psqlDir) {
    throw "psql.exe was not found under $postgresRoot (any installed PostgreSQL major version works)"
}
$psql = Join-Path $psqlDir.FullName "bin\psql.exe"

$adminCredential = Get-Credential `
    -UserName $AdminUser `
    -Message "PostgreSQL administrator for local test-database setup"
if (-not $adminCredential) {
    throw "PostgreSQL administrator credential was not supplied."
}
if ($adminCredential.UserName -ne $AdminUser) {
    throw "Expected PostgreSQL administrator role $AdminUser."
}

$randomBytes = [byte[]]::new(32)
$random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$testPassword = $null
$previousPgPassword = $env:PGPASSWORD
try {
    $random.GetBytes($randomBytes)
    $testPassword = ([Convert]::ToBase64String($randomBytes) `
        -replace "\+", "-" -replace "/", "_").TrimEnd("=")

    $env:PGPASSWORD = $adminCredential.GetNetworkCredential().Password
    $sql = @'
SELECT 'CREATE ROLE perovskite_test'
WHERE NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'perovskite_test'
) \gexec
ALTER ROLE perovskite_test
    LOGIN PASSWORD :'test_password'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
SELECT 'CREATE DATABASE perovskite_test OWNER perovskite_test'
WHERE NOT EXISTS (
    SELECT 1 FROM pg_database WHERE datname = 'perovskite_test'
) \gexec
ALTER DATABASE perovskite_test OWNER TO perovskite_test;
REVOKE ALL PRIVILEGES ON DATABASE perovskite_test FROM PUBLIC;
GRANT CONNECT ON DATABASE perovskite_test TO perovskite_test;
'@
    $sql | & $psql -X -v ON_ERROR_STOP=1 `
        -h 127.0.0.1 -p 5432 -U $AdminUser -d postgres `
        --set=test_password=$testPassword
    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL test role/database setup failed with exit code $LASTEXITCODE."
    }

    $secureTestPassword = ConvertTo-SecureString $testPassword -AsPlainText -Force
    $testCredential = [pscredential]::new("perovskite_test", $secureTestPassword)
    $credentialDirectory = Split-Path $CredentialFile -Parent
    New-Item -ItemType Directory -Path $credentialDirectory -Force | Out-Null
    [pscustomobject]@{
        Test = $testCredential
        Host = "127.0.0.1"
        Port = 5432
        Database = "perovskite_test"
    } | Export-Clixml -LiteralPath $CredentialFile -Force

    $env:PGPASSWORD = $testPassword
    & $psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 `
        -U perovskite_test -d perovskite_test -c "SELECT current_user"
    if ($LASTEXITCODE -ne 0) {
        throw "The saved test credential could not connect."
    }

    Write-Output "Configured encrypted test credential: $CredentialFile"
}
finally {
    $env:PGPASSWORD = $previousPgPassword
    $testPassword = $null
    [Array]::Clear($randomBytes, 0, $randomBytes.Length)
    $random.Dispose()
    $adminCredential = $null
}
