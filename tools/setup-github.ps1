param(
    [Parameter(Mandatory=$true)]
    [string]$RepoName,
    
    [Parameter(Mandatory=$true)]
    [string]$GithubUsername,
    
    [Parameter(Mandatory=$false)]
    [string]$Branch = "main",
    
    [Parameter(Mandatory=$false)]
    [switch]$Private
)

# Function to check if Git is installed
function Test-GitInstalled {
    try {
        git --version
        return $true
    }
    catch {
        Write-Error "Git is not installed. Please install Git and try again."
        return $false
    }
}

# Function to check if directory is already a git repository
function Test-GitRepository {
    if (Test-Path ".git") {
        Write-Warning "This directory is already a Git repository."
        $response = Read-Host "Do you want to reinitialize it? (y/n)"
        if ($response -eq 'y') {
            Remove-Item -Force -Recurse .git
            return $true
        }
        return $false
    }
    return $true
}

# Main script
if (-not (Test-GitInstalled)) {
    exit 1
}

if (-not (Test-GitRepository)) {
    exit 1
}

Write-Host "Initializing Git repository..."
git init

Write-Host "Creating and switching to $Branch branch..."
git checkout -b $Branch

Write-Host "Adding all files to Git..."
git add .

Write-Host "Creating initial commit..."
git commit -m "Initial TypeScript MCP server implementation"

$repoVisibility = if ($Private) { "private" } else { "public" }
Write-Host "Repository will be $repoVisibility"

Write-Host "Adding remote origin..."
$repoUrl = "https://github.com/$GithubUsername/$RepoName.git"
git remote add origin $repoUrl

Write-Host "Pushing to GitHub..."
git push -u origin $Branch

Write-Host "Setup complete! Repository is available at: $repoUrl"
