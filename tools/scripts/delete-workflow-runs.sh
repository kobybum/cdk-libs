#!/bin/bash

# Check if required tools are installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed. Please install it first."
    exit 1
fi

if ! command -v fzf &> /dev/null; then
    echo "Error: fzf is not installed. Please install it first."
    exit 1
fi

# Get list of unique workflow names and let user select one using fzf
echo "Fetching workflow names..."
workflow_name=$(gh workflow list --json name --jq '.[].name' | sort -u | fzf --prompt="Select workflow to delete runs for: ")

# Check if a selection was made
if [ -z "$workflow_name" ]; then
    echo "No workflow selected. Exiting..."
    exit 1
fi

# Let user select status to filter by
echo "Select run status to delete:"
status=$(printf "failed\ncompleted\nall" | fzf --prompt="Select status to delete: ")

if [ -z "$status" ]; then
    echo "No status selected. Exiting..."
    exit 1
fi

# Confirm with user
echo "This will delete $status runs for workflow: $workflow_name"
read -p "Are you sure? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 1
fi

# Get run IDs based on selected status
echo "Fetching workflow runs for '$workflow_name'..."
case "$status" in
    "failed")
        run_ids=$(gh run list --workflow "$workflow_name" --status failure --json databaseId --jq '.[].databaseId')
        ;;
    "completed")
        run_ids=$(gh run list --workflow "$workflow_name" --status completed --json databaseId --jq '.[].databaseId')
        ;;
    "all")
        run_ids=$(gh run list --workflow "$workflow_name" --json databaseId --jq '.[].databaseId')
        ;;
esac

if [ -z "$run_ids" ]; then
    echo "No $status runs found for workflow '$workflow_name'."
    exit 0
fi

# Count runs to be deleted
run_count=$(echo "$run_ids" | wc -l)
echo "Found $run_count $status runs to delete..."

# Delete each run
echo "$run_ids" | while read -r run_id; do
    if [ -n "$run_id" ]; then
        echo "Deleting run $run_id..."
        gh run delete "$run_id"
        # Add small delay to avoid rate limiting
        sleep 0.5
    fi
done

echo "Finished deleting $status runs for '$workflow_name'."