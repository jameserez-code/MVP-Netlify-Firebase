# AI Agent Passport — Scaling Architecture Plan
**Goal: Scale from single-instance MVP to production-ready SaaS serving 1M+ enforcements/day**

---

## Current Architecture (Single Instance)

```
[User] → [Netlify/Vercel CDN] → [Next.js Frontend]
                                    ↓
                              [Render Web Service]
                                    ↓
                              [Fastify API]
                                    ↓
                        [Firebase/Firestore]
```

**Bottlenecks:**
- Single API instance (no horizontal scaling)
- In-memory rate limiting (lost on restart)
- In-memory caching (lost on restart)
- No queue system (webhooks block requests)
- No connection pooling
- No read replicas
- Single region (Oregon)

---

## Phase 1: 10K Users — Foundation (Week 1)

**Target:** 10K users, 100K enforcements/day, 99.9% uptime

### Infrastructure Changes

```
[User] → [Cloudflare CDN] → [Vercel Edge]
                                ↓
                        [Render Load Balancer]
                                ↓
                    [API Instance 1] [API Instance 2]
                                ↓
                        [Redis Cluster]
                                ↓
                        [Firebase/Firestore]
```

1. **Redis (Upstash or Redis Cloud)**
   - Distributed rate limiting (replace in-memory Maps)
   - Session store (JWT blacklists, API key lookups)
   - API response caching (30s-5min TTL)
   - WebSocket presence tracking

2. **Database Optimization**
   - Deploy all Firestore composite indexes
   - Add query result caching layer
   - Add read replica for analytics queries
   - Batch writes for audit logs

3. **Load Balancing**
   - Render auto-scaling: 2-4 instances
   - Health checks every 30s
   - Sticky sessions for WebSocket

4. **CDN**
   - Cloudflare for DDoS protection
   - Asset caching (1 year for static files)
   - Edge rules for API rate limiting

5. **Monitoring**
   - Prometheus metrics export
   - Grafana dashboard
   - PagerDuty alerts on error rate > 1%

**Cost Estimate:** $200-400/month

---

## Phase 2: 100K Users — Growth (Week 2-3)

**Target:** 100K users, 1M enforcements/day, 99.95% uptime

### Infrastructure Changes

```
[User] → [Cloudflare CDN + WAF] → [Vercel Edge]
                                      ↓
                            [Render Load Balancer]
                                      ↓
                  [API 1] [API 2] [API 3] [API 4] [API N]
                      ↓         ↓         ↓         ↓
                  [Redis Cluster] ←→ [Bull Queue]
                      ↓
              [Firebase/Firestore] ←→ [BigQuery]
                      ↓
              [Cloud Storage Backups]
```

1. **Queue System (Bull + Redis)**
   - Webhook delivery queue (retry with backoff)
   - Email queue (batch sends)
   - Audit log batching (100 at a time)
   - Background job processing
   - Dead letter queue for failed jobs

2. **Database Scaling**
   - Firestore automatic scaling (already handles this)
   - BigQuery for analytics (export daily)
   - Data retention policies (90 days audit, 1 year analytics)
   - Backup: Daily automated exports to GCS

3. **Microservices Split**
   - **API Gateway:** Auth, rate limiting, routing
   - **Enforcement Service:** Policy evaluation (hottest path)
   - **Audit Service:** Audit log ingestion
   - **Webhook Service:** Webhook delivery
   - **Worker Service:** Background jobs

4. **Caching Strategy**
   - L1: In-memory (per instance, 5s TTL)
   - L2: Redis (shared, 30s-5min TTL)
   - L3: CDN (static assets, 1 year)
   - Cache warming for hot data

5. **Monitoring & Observability**
   - Distributed tracing (Jaeger or Zipkin)
   - Log aggregation (Loki or ELK)
   - APM (New Relic or Datadog)
   - Custom dashboards: enforcement latency, policy hit rates, error rates

6. **Auto-Scaling**
   - API: Scale on CPU > 70% or request queue > 100
   - Workers: Scale on queue depth > 1000
   - Database: Firestore auto-scales

**Cost Estimate:** $1,500-3,000/month

---

## Phase 3: 1M Users — Enterprise (Month 2-3)

**Target:** 1M users, 10M+ enforcements/day, 99.99% uptime, multi-region

### Infrastructure Changes

```
[User] → [Cloudflare CDN + WAF + Bot Management]
                ↓
        [Global Load Balancer (Anycast)]
                ↓
    [US-West] ←→ [US-East] ←→ [EU] ←→ [Asia]
        ↓           ↓          ↓        ↓
    [API Pods]  [API Pods] [API Pods] [API Pods]
        ↓           ↓          ↓        ↓
    [Regional Redis] ←→ [Global Redis Cluster]
        ↓           ↓          ↓        ↓
    [Regional DB] ←→ [Global DB Replication]
```

1. **Multi-Region Deployment**
   - Primary: US-West (Oregon)
   - Replicas: US-East, EU (Frankfurt), Asia (Singapore)
   - Read-heavy endpoints served from closest region
   - Writes routed to primary (async replication)

2. **Database Strategy**
   - Firestore in Datastore mode for better consistency
   - Or migrate to Cloud Spanner for global consistency
   - Read replicas in each region
   - Cross-region backups every 6 hours

3. **Kubernetes (GKE or EKS)**
   - Container orchestration
   - Horizontal Pod Autoscaling (HPA)
   - Vertical Pod Autoscaling (VPA)
   - Service mesh (Istio) for mTLS and traffic management

4. **Advanced Security**
   - Cloudflare Bot Management
   - WAF rules for API abuse
   - DDoS protection (automatic)
   - Secrets rotation (HashiCorp Vault)
   - Penetration testing (quarterly)

5. **Data Pipeline**
   - Kafka for real-time event streaming
   - Flink for stream processing
   - BigQuery for data warehousing
   - Looker or Metabase for BI

6. **Disaster Recovery**
   - RTO: 15 minutes (automatic failover)
   - RPO: 5 minutes (continuous replication)
   - Chaos engineering (monthly drills)
   - Runbooks for all failure scenarios

**Cost Estimate:** $10,000-50,000/month

---

## Scaling Decision Tree

```
Current Load?
├── < 100 users/day → Keep single instance
├── < 10K users/day → Phase 1 (Redis, CDN, monitoring)
├── < 100K users/day → Phase 2 (Queues, microservices, BigQuery)
└── > 100K users/day → Phase 3 (Multi-region, K8s, advanced caching)
```

---

## Key Metrics to Track

| Metric | Phase 1 Target | Phase 2 Target | Phase 3 Target |
|--------|---------------|---------------|---------------|
| API Response Time (p95) | < 200ms | < 100ms | < 50ms |
| Enforcement Latency (p99) | < 50ms | < 20ms | < 10ms |
| Error Rate | < 0.1% | < 0.01% | < 0.001% |
| Uptime | 99.9% | 99.95% | 99.99% |
| Daily Active Users | 10K | 100K | 1M |
| Enforcements/Day | 100K | 1M | 10M+ |
| Time to Recovery | < 30 min | < 15 min | < 5 min |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Database becomes bottleneck | Add caching layers, read replicas, query optimization |
| Redis becomes single point of failure | Redis Cluster with replicas |
| Queue backlog | Auto-scale workers, dead letter queue, alert on queue depth |
| Region outage | Multi-region deployment with automatic failover |
| Cost explosion | Cost monitoring alerts, query optimization, data retention |
| Security breach | WAF, DDoS protection, secrets rotation, audit logs |

---

## Implementation Priority

### Week 1 (Immediate)
1. ✅ Deploy Redis (Upstash free tier)
2. ✅ Replace in-memory rate limiting with Redis
3. ✅ Add API response caching
4. ✅ Deploy Firestore indexes
5. ✅ Add health checks and monitoring

### Week 2
1. ✅ Add Bull queue system
2. ✅ Move webhooks to queue
3. ✅ Move emails to queue
4. ✅ Add audit log batching
5. ✅ Add Prometheus metrics

### Week 3
1. ✅ Add Grafana dashboard
2. ✅ Add PagerDuty alerts
3. ✅ Load testing with Artillery
4. ✅ Performance tuning based on results
5. ✅ Document runbooks

---

*Last updated: 2024-05-19*
