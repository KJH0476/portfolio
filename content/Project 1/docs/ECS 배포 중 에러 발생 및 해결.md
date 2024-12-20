## 문제 1

태스크 정의에서 태스크의 태스크 IAM 역할을 설정해준 뒤, Parameter Store 에서 환경변수를 가져오도록 설정해준 후 서비스를 배포하였다. 하지만 서비스 배포 중 태스크 실행 확인 결과 지속적으로 배포가 실패되는 것을 확인할 수 있었다.

> [!warning] 오류  
> ResourceInitializationError: unable to pull secrets or registry auth: execution resource retrieval failed: unable to retrieve secrets from ssm: service call has been retried 1 time(s): AccessDeniedException: User: arn:aws:sts::471112983866:assumed-role/ecsTaskExecutionRole/17cbd22653424f62971b13fffcf6113e is not authorized to perform: ssm:GetParameters on resource: arn:aws:ssm:ap-northeast-2:471112983866:parameter/JobSyncHub/email/AWS_SES_SENDER because no identity-based policy allows the ssm:GetParameters action status code: 400, request id: 119b9aff-b7c0-4a82-a57c-f193bd929bc

해당 오류는 태스크 실행 역할 ecsTaskExecutionRole에 ssm:GetParametes 권한이 부여되지 않아 Parameter Store에서 값을 가져오지 못하는 문제였다.

### 원인

태스크 정의를 생성하면서 Parameter Store에 접근할 수 있도록 태스크 IAM 역할에 권한을 부여했으나, 실행 중 문제가 발생했다. Parameter Store의 값을 참조하려면 태스크 IAM 역할이 아닌 태스크 실행 IAM 역할에 권한을 설정해야 한다.

> **AWS** 공식문서 내용  
> 태스크 실행 IAM 역할은 작업 정의에서 _Secrets Manager_ 비밀 또는 _AWS Systems Manager Parameter Store_ 파라미터를 사용하여 민감한 데이터를 참조합니다.  
> 출처: [https://docs.aws.amazon.com/ko_kr/AmazonECS/latest/developerguide/task_execution_IAM_role.html](https://docs.aws.amazon.com/ko_kr/AmazonECS/latest/developerguide/task_execution_IAM_role.html)

> [!note] 태스크 실행 IAM 역할 vs 태스크 IAM 역할
> 태스크 실행 **IAM** 역할
> - ECS 태스크의 컨테이너를 실행하기 위해서 필요한 역할이다. 사용자를 대신해 Fargate나 EC2에 AWS API 호출을 수행할 권한을 부여한다. 기본적으로 AmazonECSTaskExecutionRolePolicy라는 관리형 정책을 제공한다. ECR에서 이미지를 가져오거나 Secret Manager, Systems Manager Parameter Store 에 접근하여 값을 가져오고 싶다면 태스크 실행 IAM 역할을 정의해주어야 한다.
> 
> 태스크 **IAM** 역할
> - ECS에서 태스크 IAM 역할을 설정하여 애플리케이션 코드가 다른 AWS 서비스를 사용할 수 있도록 해줄 수 있다. 컨테이너에서 실행되는 애플리케이션이 S3, DynamoDB와 같은 AWS의 서비스에 접근하기 위해선 태스크 IAM 역할에 해당 권한을 정의해주어야한다.

### 문제 해결

#### 처음 정의한 태스크 IAM 역할에 설정된 정책(notification-ses-policy)

```
{
	"Version": "2012-10-17",
	"Statement": [
		...
		.....
		{
			"Effect": "Allow",
			"Action": [
				"ssm:GetParameter",
				"ssm:GetParameters",
				"ssm:GetParametersByPath"
			],
			"Resource": [
				"arn:aws:ssm:ap-northeast-2:{계정 ID}:parameter/JobSyncHub/*"
			]
		}
	]
}
```

위의 태스크 IAM 역할에 정의된 Parameter Store 권한을 태스크 실행 **IAM** 역할에 설정해주어야한다.   
ecsTaskExecutionRole에 새로운 인라인 정책(notification-ses-policy) 를 생성하여 위의 Parameter Store의 권한을 추가해주었다. 이렇게 권한을 설정해준 후 태스크 정의 생성할 때 역할을 부여해주면 서비스 배포 시 태스크가 문제 없이 실행된다.

#### 수정: 태스크 IAM, 태스크 실행 IAM 역할

> **TaskexectionRole**
- 역할 이름: ecsTaskExecutionRole
- 정책 이름: ecs-exec-policy
```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Effect": "Allow",
			"Action": [
				"ssm:GetParameter",
				"ssm:GetParameters",
				"ssm:GetParametersByPath"
			],
			"Resource": [
				"arn:aws:ssm:ap-northeast-2:{계정 ID}:parameter/9900/*"
			]
		}
	]
}
```
- Parameter Store 권한은 여기에 설정해야함

> **TaskRole**
- 역할 이름: notification-task-role
- 정책 이름: notification-ses-policy
```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Effect": "Allow",
			"Action": [
				"ses:SendEmail",
				"ses:SendRawEmail"
			],
			"Resource": "*"
		}
	]
}
```

참고:[https://docs.aws.amazon.com/ko_kr/AmazonECS/latest/developerguide/task_execution_IAM_role.html](https://docs.aws.amazon.com/ko_kr/AmazonECS/latest/developerguide/task_execution_IAM_role.html)  
[https://docs.aws.amazon.com/ko_kr/AmazonECS/latest/developerguide/task-iam-roles.html](https://docs.aws.amazon.com/ko_kr/AmazonECS/latest/developerguide/task-iam-roles.html)

---

## 문제 2

> [!warning] 오류
> io.netty.resolver.dns.DnsResolveContext$SearchDomainUnknownHostException: Failed to resolve 'user-api.service-connect.me' [A(1)] and search domain query for configured domains failed as well

이 오류는 애플리케이션이 user-api.service-connect.me 도메인을 DNS로 해석하려고 했지만 실패했다는 의미이다. user-api.service-connect.me는 User Service 태스크를 생성할 때 설정한 Service Connect 도메인 네임으로, 이 도메인을 API Gateway에 라우팅 주소로 설정했으나 DNS 해석 실패로 인해 오류가 발생한 것이다.

### Service Connect 연결 구성

Service Connect를 설정할때는 클라이언트 측만 해당 옵션과 클라이언트 및 서버 옵션이 주어진다. 

- **클라이언트 측만 해당** 옵션은 서비스 자신이 특정 네임스페이스에 해당하는 다른 서비스에 연결 요청만 하는 경우 사용한다. 예를들어 프론트엔드, 리버시 프록시, 애플리케이션에 연결된 ELB 등 외부 트래픽을 수신하는 경우에 사용한다.
- **클라이언트 및 서버** 옵션은 동일한 네임스페이스 안에서 서비스 간 요청을 주고 받는 경우에 사용한다. 예를들어 백엔드, 미들웨어, 네트워크 요청을 받는 마이크로서비스인 경우에 사용한다.

현재 프로젝트의 경우에는 ELB와 연결된 Api Gateway 컨테이너가 요청을 받아서 뒷단의 서비스들에게 요청을 전달한다. 따라서 Api Gatway는 클라이언트 모드로 설정하고 뒷단의 서비스들은 클라이언트 및 서버 모드로 설정해주었다.

### 원인 및 해결

> **AWS** 블로그 내용  
> 여기서 주의할 점은 서비스를 새롭게 배포하거나 기존 서비스에 _Service Connect를 처음 적용하는 경우_, 반드시 배포 순서에 유의해야 한다는 것입니다. 만약 기존 서비스에 적용하는 경우 클라이언트-_서버 모드 옵션을 적용하는 서비스부터 Service Connect를 적용해야 합니다_.
> 출처: [https://aws.amazon.com/ko/blogs/tech/run-microservices-easily-with-amazon-ecs-service-connect/](https://aws.amazon.com/ko/blogs/tech/run-microservices-easily-with-amazon-ecs-service-connect/)

문제의 원인은 배포 순서에 있었다. 클라이언트 모드로 설정된 API Gateway 컨테이너를 먼저 배포하고, 뒤이어 User Service를 배포하면서 DNS를 찾지 못한 것이다. 올바른 순서로 배포되지 않아 발생한 오류였다.

Service Connect를 처음 적용할 때는 배포 순서가 중요하다. 먼저 클라이언트-서버 모드로 설정된 서비스부터 Service Connect를 적용하여 배포해야 한다. Service Connect가 활성화되면 이 서비스의 엔드포인트(DNS 주소 또는 clientAlias 값)가 네임스페이스에 등록되고, 이후 클라이언트 모드로 설정된 서비스를 배포하면, 네임스페이스에 등록된 클라이언트-서버 모드 서비스의 엔드포인트와 연결이 가능하다. 

참고:  
[https://aws.amazon.com/ko/blogs/tech/run-microservices-easily-with-amazon-ecs-service-connect/](https://aws.amazon.com/ko/blogs/tech/run-microservices-easily-with-amazon-ecs-service-connect/)