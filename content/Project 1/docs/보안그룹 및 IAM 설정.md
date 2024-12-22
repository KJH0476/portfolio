### 보안그룹 인바운드 규칙
#### Application Load Balancer
| 유형     | 포트 범위 | 소스        |
| ------ | ----- | --------- |
| HTTP   | 80    | 0.0.0.0/0 |
| HTTPS  | 443   | 0.0.0.0/0 |

#### Bastion Host (EC2)
| 유형     | 포트 범위 | 소스       |
|----------|-----------|------------|
| SSH      | 22        | 내 IP      |
| 사용자 지정 | 5601      | 내 IP      |

#### 컨테이너 서비스별 보안그룹 설정

##### Authorization Service
| 유형       | 포트 범위 | 소스         |
|------------|-----------|--------------|
| 사용자 지정 | 8000      | ALB 보안그룹 |

##### User Service
| 유형       | 포트 범위 | 소스                              |
|------------|-----------|-----------------------------------|
| 사용자 지정 | 8081      | Authorization Service 보안그룹     |

##### Notification Service
| 유형       | 포트 범위 | 소스                              |
|------------|-----------|-----------------------------------|
| 사용자 지정 | 8082      | Authorization Service 보안그룹     |
| 사용자 지정 | 8082      | Reservation Service 보안그룹       |

##### Search Service
| 유형       | 포트 범위 | 소스                              |
|------------|-----------|-----------------------------------|
| 사용자 지정 | 8083      | Authorization Service 보안그룹     |

##### Reservation Service
| 유형       | 포트 범위 | 소스                              |
|------------|-----------|-----------------------------------|
| 사용자 지정 | 8084      | Authorization Service 보안그룹     |

#### 데이터베이스
##### RDS (회원 DB)
| 유형       | 포트 범위 | 소스                  |
|------------|-----------|-----------------------|
| PostgreSQL | 5432      | User Service 보안그룹 |
| PostgreSQL | 5432      | Bastion Host 보안그룹 |

##### RDS (예약 DB)
| 유형       | 포트 범위 | 소스                      |
|------------|-----------|---------------------------|
| PostgreSQL | 5432      | Reservation Service 보안그룹 |
| PostgreSQL | 5432      | Bastion Host 보안그룹     |

##### ElastiCache
| 유형       | 포트 범위 | 소스                      |
|------------|-----------|---------------------------|
| 사용자 지정 | 6379      | Authorization Service 보안그룹 |
| 사용자 지정 | 6379      | User Service 보안그룹     |

##### OpenSearch Service
| 유형       | 포트 범위 | 소스                      |
|------------|-----------|---------------------------|
| HTTPS      | 443       | Bastion Host 보안그룹     |
| HTTPS      | 443       | Authorization Service 보안그룹 |
| HTTPS      | 443       | User Service 보안그룹     |
| HTTPS      | 443       | Reservation Service 보안그룹 |
| HTTPS      | 443       | Notification Service 보안그룹 |
| HTTPS      | 443       | Search Service 보안그룹   |
| HTTPS      | 443       | Lambda 보안그룹           |

---
### IAM 설정

#### 태스크 실행 IAM (모든 태스크 적용)
| Effect | Action                                    | Resource               |
|--------|------------------------------------------|------------------------|
| Allow  | ssm:GetParameter, ssm:GetParameters, ssm:GetParametersByPath | Parameter Store ARN    |
#### 태스크 IAM

| Effect | Action                                    | Resource                                            |
| ------ | ----------------------------------------- | --------------------------------------------------- |
| Allow  | es:ESHttpPost, es:ESHttpGet, es:ESHttpPut | OpenSearch Domain ARN                               |
| Allow  | ses:SendEmail, ses:SendRawEmail           | Simple Email Service ARN (Notification Service에 적용) |

### Bastion Host IAM
| Effect | Action                                    | Resource               |
|--------|------------------------------------------|------------------------|
| Allow  | es:ESHttpPost, es:ESHttpGet, es:ESHttpPut, es:ESHttpDelete | OpenSearch Domain ARN  |

### Lambda 함수 IAM

| Effect | Action                                    | Resource               |
|--------|------------------------------------------|------------------------|
| Allow  | dynamodb:GetRecords, dynamodb:GetShardIterator, dynamodb:DescribeStream, dynamodb:ListStreams | DynamoDB Streams ARN  |

### OpenSearch 리소스 정책
| Effect | Principal                                            | Action                                                     | Resource              |
| ------ | ---------------------------------------------------- | ---------------------------------------------------------- | --------------------- |
| Allow  | Lambda 함수 IAM ARN, 태스크 IAM ARN, Bastion Host IAM ARN | es:ESHttpPost, es:ESHttpGet, es:ESHttpPut, es:ESHttpDelete | OpenSearch Domain ARN |
