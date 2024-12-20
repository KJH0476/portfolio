### 개요

현재 서비스는 모든 API 요청이 먼저 API Gateway를 통해 인증과 인가를 수행한 후, 대상 서비스로 라우팅되는 구조로 구성되어 있다. 어떤 사용자가 어떤 기능을 이용했는지 명확하게 추적하고 사용자별 요청 흐름을 쉽게 파악하기 위해 API Gateway는 각 요청에 대해 고유한 Request ID를 생성하고 JWT 토큰에서 사용자 이메일 정보를 추출하여 로그를 남긴다. 그리고 이 데이터를 요청 헤더에 추가하여 뒷단의 서비스에 요청을 전달하고 로그를 남기도록 구성되어 있다.  
그래서 API Gateway 에서 아래 코드와 같이 뒷단의 서비스에게 요청을 전달하기 전에 헤더에 값이 추가되도록 처리해주었다.

```
String requestId = UUID.randomUUID().toString().substring(0, 8);

// 기존의 요청을 유지하면서 새로운 헤더 추가
ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()  
        .header("X-User-Email", requestEmail)  
        .header("X-Request-Id", requestId)  
        .build(); 
  
exchange = exchange.mutate().request(mutatedRequest).build();

return chain.filter(exchange);
```

### 문제 발생

> [!warning] **UnsupportedOperationException**
> 
> java.lang.UnsupportedOperationException: null  
> at org.springframework.http.ReadOnlyHttpHeaders.add(ReadOnlyHttpHeaders.java:95)  
> at org.springframework.cloud.gateway.filter.factory.AddRequestHeaderGatewayFilterFactory$1.lambda$filter$0(AddRequestHeaderGatewayFilterFactory.java:41)

Spring Cloud Gateway를 사용하면서 AddRequestHeaderGatewayFilterFactory를 통해 요청 헤더를 추가하려고 시도할 때, 다음과 같은 예외가 발생했다.  
여기서 AddRequestHeaderGatewayFilterFactory는 Spring Cloud Gateway에서 요청을 다른 서비스로 전달하기 전에 HTTP 요청 헤더에 새로운 헤더를 추가할 수 있도록 해주는 객체이다.

### 원인

```
// 새로운 헤더 추가
ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()  
        .header("X-User-Email", requestEmail)  
        .header("X-Request-Id", requestId)  
        .build(); 
```

기존 코드에는 exchange.getRequest().mutate()로 현재의 ServerHttpRequest 객체를 변경할 수 있는 빌더를 생성한다. 이후 .request(builder -> builder.headers(...))메소드로 ServerHttpRequest를 수정하기 위해 요청을 변경하는 람다 함수를 제공한다. 이 람다 함수는 기존 헤더에 새로운 헤더를 추가한다. 변경된 설정을 기반으로 새로운 ServerHttpRequest 객체를 생성한다. 이것을 풀어보면 아래와 같다.

```
// ServerHttpRequest 객체를 수정할 수 있는 빌더 객체 생성  
ServerHttpRequest.Builder builder = exchange.getRequest().mutate();  
// ServerHttpRequest 빌더 객체 헤더에 X-Request-Id 추가  
ServerHttpRequest.Builder header = builder.header("X-Request-Id", requestId);  
// 헤더를 추가한 ServerHttpRequest 빌더 객체에 build 메소드로 ServerHttpRequest 객체 생성  
ServerHttpRequest build = header.build();
```

하지만 여기서 ServerHttpRequest 객체는 불변(immutable)으로 설계된 객체이며 읽기 전용이다. 이 객체에 직접적으로 헤더를 추가하려고 시도하여 UnsupportedOperationException이 발생한 것이다.

### 해결

> **Spring 공식문서 내용**
> _default ServerHttpRequest.Builder mutate(): 이 요청의 속성을 변경하는 빌더를 반환하고 ServerHttpRequestDecorator 변경된 값으로 래핑하여 반환하거나 이 인스턴스에 다시 위임합니다._  
> 출처: [https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/http/server/reactive/ServerHttpRequest.html](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/http/server/reactive/ServerHttpRequest.html)

Spring 공식문서를 보면 mutate() 메소드를 적용하면 요청을 변경할때 ServerHttpReqeustDecorator를 사용해서 변경된 요청을 생성한다.  
기존 코드도 mutate()를 사용해서 헤더를 추가했는데 계속 똑같은 UnsupportedOperationException 에러가 발생하였다. 그래서 명시적으로 ServerHttpRequestDecorator를 사용해주었다.  
새로운 ServerHttpRequest 객체를 생성하여 ServerHttpRequestDecorator를 사용하여 헤더가 변경된 요청을 새로 생성하고, getHeaders 메서드를 오버라이드하여 기존 헤더를 유지하면서 추가 헤더를 넣은 새로운 ServerHttpRequest를 반환하도록 해주었다.

> **변경 코드**

```
// ServerHttpRequest 객체를 데코레이터 패턴으로 감싸 새로운 헤더를 추가
ServerHttpRequest decoratedRequest = new ServerHttpRequestDecorator(exchange.getRequest()) {  
    @Override  
    public HttpHeaders getHeaders() {  
        HttpHeaders headers = new HttpHeaders();  
        headers.putAll(super.getHeaders());  
        headers.add("X-User-Email", requestEmail);  
        headers.add("X-Request-Id", requestId);  
        return headers;  
    }  
};  
  
// 변경된 헤더를 포함하는 새로운 요청을 가진 ServerWebExchange 객체를 생성 
ServerWebExchange mutatedExchange = exchange.mutate().request(decoratedRequest).build();

return chain.filter(mutatedExchange);
```

이렇게 생성된 객체로 변경된 헤더를 포함하는 새로운 요청을 가진 ServerWebExchange 객체를 생성하여 뒷단의 서비스에 요청이 전달된다. 이를 통해 API Gateway를 지나면서 요청 헤더에 X-User-Email과 X-Request-Id가 추가되어, 이후 서비스에서도 동일한 요청 ID와 사용자 이메일 정보를 추적할 수 있게 된다. 이로써 일관성 있는 로깅과 사용자 행동 추적이 가능해진다.

> **ServerHttpRequestDecorator**
> 
> - ServerHttpRequestDecorator는 기존의 ServerHttpRequest(HTTP request)를 감싸서 데코레이터 패턴을 통해 요청의 특정 부분을 수정하거나 추가할 수 있도록 해주는 클래스이다. 원래의 ServerHttpRequest 객체가 가지고 있는 요청 데이터는 그대로 유지하면서, 이를 데코레이터로 감싸고 필요한 부분만 재정의하여 변경할 수 있다.
>     

참고:  
[https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/http/server/reactive/ServerHttpRequest.html](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/http/server/reactive/ServerHttpRequest.html)  
[https://docs.spring.io/spring-cloud-gateway/reference/spring-cloud-gateway/developer-guide.html](https://docs.spring.io/spring-cloud-gateway/reference/spring-cloud-gateway/developer-guide.html)