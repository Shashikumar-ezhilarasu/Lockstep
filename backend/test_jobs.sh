TOKEN=$(curl -s -X POST http://localhost:3001/auth/login -H "Content-Type: application/json" -d '{}' | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
echo "Token: $TOKEN"

ORG=$(curl -s -X POST http://localhost:3001/orgs -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Test Org"}' | grep -o '"id":"[^"]*' | head -1 | grep -o '[^"]*$')
echo "Org: $ORG"

PROJ=$(curl -s -X POST http://localhost:3001/orgs/$ORG/projects -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Test Proj"}' | grep -o '"id":"[^"]*' | head -1 | grep -o '[^"]*$')
echo "Proj: $PROJ"

QUEUE=$(curl -s -X POST http://localhost:3001/projects/$PROJ/queues -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"metrics-test","concurrency_limit":5}' | grep -o '"id":"[^"]*' | head -1 | grep -o '[^"]*$')
echo "Queue: $QUEUE"

for i in {1..5}; do
  curl -s -X POST http://localhost:3001/queues/$QUEUE/jobs -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"type":"immediate","payload":{"handler":"sleep_simulate","ms":100}}'
done

curl -s -X POST http://localhost:3001/queues/$QUEUE/jobs -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"type":"immediate","payload":{"handler":"fail_simulate"}}'
curl -s -X POST http://localhost:3001/queues/$QUEUE/jobs -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"type":"immediate","payload":{"handler":"fail_simulate"}}'

