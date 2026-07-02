#!/bin/bash
export API=http://localhost:3001

echo "--- SECTION 1 ---"
echo "1.1 Login"
LOGIN_RES=$(curl -s -X POST $API/auth/login -H "Content-Type: application/json" -d '{}')
export TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
echo "Token: $TOKEN"

echo "1.2 Create Org"
ORG_RES=$(curl -s -w "\n%{http_code}\n" -X POST $API/orgs -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Test Org"}')
ORG_STATUS=$(echo "$ORG_RES" | tail -n1)
ORG_BODY=$(echo "$ORG_RES" | sed '$d')
echo "Status: $ORG_STATUS"
echo "Body: $ORG_BODY"
export ORG_ID=$(echo $ORG_BODY | grep -o '"id":"[^"]*' | grep -o '[^"]*$')
echo "Org ID: $ORG_ID"

echo "1.3 Create Project"
PROJ_RES=$(curl -s -w "\n%{http_code}\n" -X POST $API/orgs/$ORG_ID/projects -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Test Project"}')
PROJ_STATUS=$(echo "$PROJ_RES" | tail -n1)
PROJ_BODY=$(echo "$PROJ_RES" | sed '$d')
echo "Status: $PROJ_STATUS"
echo "Body: $PROJ_BODY"
export PROJECT_ID=$(echo $PROJ_BODY | grep -o '"id":"[^"]*' | grep -o '[^"]*$')
echo "Project ID: $PROJECT_ID"

echo "1.4 Negative test - no token"
curl -s -o /dev/null -w "%{http_code}\n" $API/orgs

echo "1.5 Negative test - cross-org"
TOKEN2=$(curl -s -X POST $API/auth/login -H "Content-Type: application/json" -d '{}' | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
curl -s -o /dev/null -w "%{http_code}\n" $API/orgs/$ORG_ID/projects -H "Authorization: Bearer $TOKEN2"

echo "--- SECTION 2 ---"
echo "2.1 Create queue"
QUEUE_RES=$(curl -s -w "\n%{http_code}\n" -X POST $API/projects/$PROJECT_ID/queues -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"default","priority":5,"concurrency_limit":3,"retry_policy":{"strategy":"exponential","base_delay_ms":1000,"multiplier":2,"max_attempts":3,"max_delay_ms":30000}}')
QUEUE_STATUS=$(echo "$QUEUE_RES" | tail -n1)
QUEUE_BODY=$(echo "$QUEUE_RES" | sed '$d')
echo "Status: $QUEUE_STATUS"
echo "Body: $QUEUE_BODY"
export QUEUE_ID=$(echo $QUEUE_BODY | grep -o '"id":"[^"]*' | grep -o '[^"]*$')

echo "2.2 Get queue stats"
curl -s $API/queues/$QUEUE_ID/stats -H "Authorization: Bearer $TOKEN" | grep -o '"total_jobs":0' || echo "Failed"

echo "2.3 Pause queue"
curl -s -X POST $API/queues/$QUEUE_ID/pause -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s $API/queues/$QUEUE_ID -H "Authorization: Bearer $TOKEN" | grep -o '"status":"paused"' || echo "Failed"

echo "2.4 Resume queue"
curl -s -X POST $API/queues/$QUEUE_ID/resume -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s $API/queues/$QUEUE_ID -H "Authorization: Bearer $TOKEN" | grep -o '"status":"active"' || echo "Failed"

echo "--- SECTION 3 ---"
echo "3.1 Immediate job"
curl -s -w "\n%{http_code}\n" -X POST $API/queues/$QUEUE_ID/jobs -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"type":"immediate","payload":{"handler":"sleep_simulate","ms":500}}'

echo "3.2 Delayed job"
curl -s -w "\n%{http_code}\n" -X POST $API/queues/$QUEUE_ID/jobs -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"type":"delayed","delay_ms":60000,"payload":{"handler":"sleep_simulate","ms":100}}'

echo "3.3 Recurring job"
curl -s -w "\n%{http_code}\n" -X POST $API/queues/$QUEUE_ID/jobs/recurring -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"cron":"*/2 * * * *","timezone":"UTC","job_template":{"payload":{"handler":"sleep_simulate","ms":100}}}'

echo "3.4 Invalid cron"
curl -s -o /dev/null -w "%{http_code}\n" -X POST $API/queues/$QUEUE_ID/jobs/recurring -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"cron":"not a cron","job_template":{"payload":{}}}'

echo "3.5 Idempotency"
curl -s -w "\n%{http_code}\n" -X POST $API/queues/$QUEUE_ID/jobs -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"type":"immediate","idempotency_key":"dup-test-1","payload":{"handler":"sleep_simulate","ms":100}}'
curl -s -w "\n%{http_code}\n" -X POST $API/queues/$QUEUE_ID/jobs -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"type":"immediate","idempotency_key":"dup-test-1","payload":{"handler":"sleep_simulate","ms":100}}'

echo "3.6 Batch job"
curl -s -w "\n%{http_code}\n" -X POST $API/queues/$QUEUE_ID/jobs -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"type":"batch","items":[{"payload":{"handler":"sleep_simulate","ms":100}},{"payload":{"handler":"sleep_simulate","ms":100}},{"payload":{"handler":"sleep_simulate","ms":100}}]}'

echo "3.7 Deliberate failure job"
FAIL_RES=$(curl -s -w "\n%{http_code}\n" -X POST $API/queues/$QUEUE_ID/jobs -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"type":"immediate","payload":{"handler":"fail_simulate"}}')
FAIL_BODY=$(echo "$FAIL_RES" | sed '$d')
export FAIL_JOB_ID=$(echo $FAIL_BODY | grep -o '"id":"[^"]*' | head -n1 | grep -o '[^"]*$')
echo "Fail Job ID: $FAIL_JOB_ID"

echo "DONE RUNNING SECTION 1-3"
