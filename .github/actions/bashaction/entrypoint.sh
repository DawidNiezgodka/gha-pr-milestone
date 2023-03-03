#!/bin/bash

# Scripts from Michael Heap course on GitHub Actions
if [[ "$GITHUB_EVENT_NAME" != "pull_request" ]]; then
  echo "This action only runs on pull requests."
  echo "Found: $GITHUB_EVENT_NAME"
  exit 1
fi

ACTION=$(jq -r .action $GITHUB_EVENT_PATH)
if [[ "$ACTION" != "closed" ]]; then
  echo "This action only runs when a pull request is closed."
  echo "Found: $GITHUB_EVENT_NAME.$ACTION"
  exit 1
fi

MERGED=$(jq -r .pull_request.merged $GITHUB_EVENT_PATH)
if [[ "$MERGED" != "true" ]]; then
  echo "This action only runs when a pull request is merged."
  echo "Found: $GITHUB_EVENT_NAME.$ACTION.merged=$MERGED"
  exit 1
fi

PULLS=""
URL="https://api.github.com/repos/$GITHUB_USER/$GITHUB_REPOSITORY/pulls?state=closed&per_page=100"
echo "Calling: $URL"
while [ "$URL" ]; do
  # This line uses the curl command to make an HTTP request to the URL specified by $URL.
  # The options used are -i to include the response headers in the output,
  # -S to show error messages, and -H to include an Authorization header
  # with a token value provided by the $GITHUB_TOKEN variable.
  # The output of the command is then stored in the variable $RESPONSE.
  RESPONSE=$(curl -i -S -H "Authorization: token $GITHUB_TOKEN" "$URL")


  # Search for a line that contains only a carriage return character
  # and exit the script as soon as such a line is found.
  # ^: this matches the beginning of a line.
  # \r: this matches a carriage return character, which is typically used as a line separator
  # in some text files on Windows-based systems.
  # $: this matches the end of a line.
  HEADERS=$(echo "$RESPONSE" | sed '/^\r$/q')


  #URL=$(echo "$HEADERS" | grep '^Link:' | sed -e 's/^Link:.*<\(.*\)>;.*$/\1/')
  URL=$(echo "$HEADERS" | sed -n -E 's/^Link:.*<(.*?)>; rel="next".*$/\1/p')
  echo "URL is: $URL"
  # This command appends the output of the sed command to the $PULLS variable.
  # The syntax $PULLS$(...) appends the output of the command inside
  # the parentheses to the end of the existing value of the $PULLS variable.
  # This is a way of concatenating strings in Bash.
  PULLS="$PULLS$(echo "$RESPONSE" | sed -e '/^\r$/d')"
done

PR_AUTHOR=$(jq -r ".pull_request.user.login" $GITHUB_EVENT_PATH)
# The value of $PULLS variable is being piped to the next command in the pipeline.
# jq -c ".[] | select(.merged_at != null) | select(.user.login == \"$PR_AUTHOR\")":
  # This command uses the jq tool to filter and process JSON data.
  # It takes the input from the previous command in the pipeline and performs the following operations:
    # .[]: This selects all elements of an array in the input (assuming the input is an array).
    # select(.merged_at != null): This filters out any elements that do not have a merged_at
    # attribute that is not null. In other words, it selects only elements that have been merged.
    # select(.user.login == \"$PR_AUTHOR\"): This filters out any elements that
    # do not have a user attribute with a login attribute that matches the value
    # of the PR_AUTHOR shell variable.
    # The \" is used to escape the quotes around the value of PR_AUTHOR
    # so that it can be properly interpreted by the jq command.
    #-c: This option tells jq to output the results as a single line of JSON, rather than pretty-printing it.
#wc -l: This command counts the number of lines in the input that it receives.
#tr -d '[:space]': This command removes any whitespace characters from the input that it receives.
MERGED_COUNT=$(echo $PULLS | jq -c ".[] | select(.merged_at != null) | select(.user.login == \"$PR_AUTHOR\")" | wc -l | tr -d '[:space]')

# This line creates a new variable called COMMENT_VAR,
# which is set to a string that is the concatenation of "INPUT_MERGED_"
# and the value of another variable called MERGED_COUNT.
# The result is that COMMENT_VAR will be set to a string that depends on the value of MERGED_COUNT.
# For example, if MERGED_COUNT is 2, COMMENT_VAR will be set to "INPUT_MERGED_2".
COMMENT_VAR="INPUT_MERGED_${MERGED_COUNT}"
# This line uses a feature of Bash called "indirect expansion"
# to retrieve the value of the variable whose name is stored in COMMENT_VAR.
# The ! operator is used to perform this expansion.
# The result is that COMMENT is set to the value of the variable whose name is stored in COMMENT_VAR.
COMMENT="${!COMMENT_VAR}"

#  This line starts an if statement that checks if the value of COMMENT is empty
#  (i.e., it has zero length). The -z option is used to perform this check.
if [[ -z "$COMMENT" ]]; then
  echo "No comment to post."
  exit 0
fi

ISSUE_NUMBER=$(jq -r .pull_request.number $GITHUB_EVENT_PATH)
# The output of the echo command is piped to jq, which processes it as follows:
#   -c option: Tells jq to output the result as a single line of JSON, rather than pretty-printing it.
#   -R option: Tells jq to read the input as raw strings, rather than JSON.
#   '.': This is a filter that selects the entire input object.
#   | {body: .}: This takes the selected input and creates a new JSON object with a single key-value pair,
#   where the key is "body" and the value is the input itself.
#   The result is a new JSON object that contains a single key "body"
#   with the value of the COMMENT variable as its value.
POSTBODY=$(echo $COMMENT | jq -c -R '. | {body: .}')

COMMEND_ADDED=$(curl -i -S -H "Authorization: token $GITHUB_TOKEN" \
-H "Content-Type: application/json" -X POST \
--data "$POSTBODY" "https://api.github.com/repos/$GITHUB_REPOSITORY/issues/$ISSUE_NUMBER/comments")

echo $COMMEND_ADDED | head -n1 | grep -q "201 Created" > /dev/null
if [ $? -eq 1 ]; then
  echo "Failed to post comment."
  echo $COMMEND_ADDED | sed '1,/^$/d'
  exit 1
fi

echo "Added comment: $COMMENT"

LABELS='{"labels": ["merge-milestone", "merge-milestone: '$MERGED_COUNT'"]}'
LABELS_ADDED=$(curl -i -S -H "Authorization: token $GITHUB_TOKEN" \
"https://api.github.com/repos/$GITHUB_REPOSITORY/issues/$ISSUE_NUMBER/labels" -d "$LABELS")

echo $LABELS_ADDED | head -n1 | grep -q "200 OK" > /dev/null
if [ $? -eq 1 ]; then
  echo "Failed to add labels."
  echo $LABELS_ADDED | sed '1,/^$/d'
  exit 1
fi
