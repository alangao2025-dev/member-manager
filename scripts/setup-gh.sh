#!/usr/bin/env bash
# Install GitHub CLI, log in with a token, and configure git.
# Usage: bash setup-gh.sh            (prompts for token / name / email)
#        GH_SETUP_TOKEN=xxx GIT_NAME=xx GIT_EMAIL=xx bash setup-gh.sh   (non-interactive)
set -euo pipefail

info() { printf '\033[32m==>\033[0m %s\n' "$*"; }
die()  { printf '\033[31m错误:\033[0m %s\n' "$*" >&2; exit 1; }

if [ "$(id -u)" -eq 0 ]; then SUDO=""; else
  command -v sudo >/dev/null || die "需要 root 权限或 sudo"
  SUDO="sudo"
fi

install_gh() {
  if command -v gh >/dev/null; then
    info "gh 已安装：$(gh --version | head -1)"
    return
  fi
  info "安装 gh ..."
  if command -v apt-get >/dev/null; then
    $SUDO apt-get update -y
    $SUDO apt-get install -y curl ca-certificates git
    $SUDO mkdir -p -m 755 /etc/apt/keyrings
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      | $SUDO tee /etc/apt/keyrings/githubcli-archive-keyring.gpg >/dev/null
    $SUDO chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      | $SUDO tee /etc/apt/sources.list.d/github-cli.list >/dev/null
    $SUDO apt-get update -y
    $SUDO apt-get install -y gh
  elif command -v dnf >/dev/null; then
    $SUDO dnf install -y 'dnf-command(config-manager)' git || true
    $SUDO dnf config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo \
      || $SUDO dnf config-manager addrepo --from-repofile=https://cli.github.com/packages/rpm/gh-cli.repo
    $SUDO dnf install -y gh
  elif command -v yum >/dev/null; then
    $SUDO yum install -y yum-utils git
    $SUDO yum-config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo
    $SUDO yum install -y gh
  elif command -v brew >/dev/null; then
    brew install gh git
  else
    die "不支持的系统，请参考 https://github.com/cli/cli#installation 手动安装"
  fi
  info "安装完成：$(gh --version | head -1)"
}

# Env tokens make gh report "logged in" without storing credentials, which git needs.
gh_stored() { env -u GH_TOKEN -u GITHUB_TOKEN gh "$@"; }

login_gh() {
  if gh_stored auth status >/dev/null 2>&1; then
    info "gh 已登录"
  else
    local token="${GH_SETUP_TOKEN:-}"
    if [ -z "$token" ]; then
      read -rsp "请粘贴 GitHub Token（输入不显示）: " token </dev/tty; echo
    fi
    [ -n "$token" ] || die "Token 为空"
    printf '%s' "$token" | gh_stored auth login --with-token
    unset token
  fi
  gh_stored auth setup-git
  info "$(gh_stored auth status 2>&1 | grep -m1 -i 'logged in' | sed 's/^ *//')"
}

config_git() {
  local name email
  name="$(git config --global user.name || true)"
  email="$(git config --global user.email || true)"
  if [ -z "$name" ]; then
    name="${GIT_NAME:-}"
    [ -n "$name" ] || read -rp "git 提交用户名: " name </dev/tty
    git config --global user.name "$name"
  fi
  if [ -z "$email" ]; then
    email="${GIT_EMAIL:-}"
    [ -n "$email" ] || read -rp "git 提交邮箱: " email </dev/tty
    git config --global user.email "$email"
  fi
  git config --global init.defaultBranch main
  info "git 身份：$(git config --global user.name) <$(git config --global user.email)>"
}

install_gh
login_gh
config_git
info "全部完成"
