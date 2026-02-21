# ======================================================
# PowerShell Script: Candidate Auto-Apply Test
# ======================================================

# Force TLS 1.2 for HTTP requests
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Base URL of backend
$baseUrl = "http://localhost:5000/api"

# -----------------------------
# Step 0: Generate random candidate email
# -----------------------------
$randomNum = Get-Random -Minimum 1000 -Maximum 9999
$candidateEmail = "candidate_test$randomNum@example.com"
Write-Host "Generated candidate email: $candidateEmail"

# -----------------------------
# Step 1: Register Candidate
# -----------------------------
$candidateBody = @{
    email = $candidateEmail
    password = "password123"
    firstName = "Candidate"
    lastName  = "User"
    role      = "CANDIDATE"
} | ConvertTo-Json -Compress

Write-Host "`nRegistering candidate..."
try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body $candidateBody
    Write-Host " Candidate registered successfully."
} catch {
    if ($_.Exception.Message -match "already exists") {
        Write-Host " Candidate already exists. Skipping registration."
    } else {
        Write-Host " Registration failed:" $_.Exception.Message
        exit
    }
}

# -----------------------------
# Step 2: Login Candidate
# -----------------------------
$loginBody = @{
    email = $candidateEmail
    password = "password123"
} | ConvertTo-Json -Compress

Write-Host "`nLogging in candidate..."
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $candidateToken = $loginResponse.accessToken
    Write-Host " Candidate logged in successfully."
    Write-Host "Token:`n$candidateToken"
} catch {
    Write-Host " Login failed:" $_.Exception.Message
    exit
}

# -----------------------------
# Step 3: Get first approved job
# -----------------------------
Write-Host "`nFetching approved jobs..."
$jobsResponse = Invoke-RestMethod -Uri "$baseUrl/jobs" -Method GET
if ($jobsResponse.data.Count -eq 0) {
    Write-Host " No jobs available to apply for."
    exit
}

# Pick the first approved job
$job = $jobsResponse.data | Where-Object { $_.status -eq "APPROVED" } | Select-Object -First 1
if (-not $job) {
    Write-Host " No approved jobs found."
    exit
}

$jobId = $job.id
Write-Host "Using Job ID: $jobId - $($job.title)"

# -----------------------------
# Step 4: Create a test PDF resume
# -----------------------------
$resumePath = "$PWD\resume.pdf"

@"
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 51 >>
stream
BT /F1 24 Tf 100 700 Td (Sample Resume) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000010 00000 n
0000000056 00000 n
0000000111 00000 n
0000000217 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
291
%%EOF
"@ | Out-File -FilePath $resumePath -Encoding ascii

Write-Host "`nCreated test resume at $resumePath"

# -----------------------------
# Step 5: Apply for job with curl
# -----------------------------
Write-Host "`nApplying for job..."
$curlPath = "C:\Users\ching\AppData\Local\Microsoft\WinGet\Packages\cURL.cURL_Microsoft.Winget.Source_8wekyb3d8bbwe\curl-8.18.0_4-win64-mingw\bin\curl.exe"

& $curlPath -X POST "$baseUrl/applications" `
    -H "Authorization: Bearer $candidateToken" `
    -F "resume=@$resumePath" `
    -F "jobId=$jobId" `
    -F "coverLetter=I am very interested in this position and believe my skills match perfectly."

Write-Host "`nCandidate application submitted successfully!"
