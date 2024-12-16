# 🎯 Slack 모든 이벤트 예외처리

가장 힘들었던 점 중 하나는 바로 다양한 이벤트에 대한 예외처리였습니다. 슬랙 이벤트를 구독한 앱을 슬랙 채널에 추가하면 내가 구독한 이벤트가 발생할 때마다 요청이 옵니다. 제가 원하는 이벤트만 온다면 좋았겠지만, 제가 필요로하지 않는 이벤트도 모두 요청이 들어와서 이것을 모두 전처리 해주어야했습니다.
저는 `message.channels`, `reaction_added`, `reaction_removed` 총 3개의 이벤트를 구독했습니다.

- `messege.channels`: 채널 내의 모든 메세지에 대한 이벤트를 구독(메세지 게시, 메세지 삭제, 메세지 편집 + 스레드 답글의 경우도 모두 포함)
- `reaction_added`: 채널 내의 모든 리액션 추가 이벤트를 구독
- `reaction_removed`: 채널 내의 모든 리액션 삭제 이벤트를 구독

위의 이벤트를 구독하여서 이에 해당하는 이벤트가 발생하면 바로 요청이 옵니다. 하지만 저는 TIL 챌린지 게시글이 달린 답글만 추적하고 싶었고, 리액션 또한 TIL 챌린지 답글에 달린 메세지의 👍 리액션만 필요했습니다.</br>
저는 제가 원하는 정보만 받기 위해 총 message `type`과 특정 이벤트에만 포함된 필드 값으로 구분하여 분기처리해주었습니다.

### 1️⃣ 채널에 메세지가 게시된 경우 이벤트

```json
{
  "user": "U07E89T5XB5",
  "type": "message",
  "ts": "1722864232.958839",
  "client_msg_id": "5cc4c6d3-7928-4f2b-aab2-7ab12ac4284b",
  "text": "*[TIL 7월 5주차]*\n❤️ ㅋㅋㅋ",
  "team": "T07EDM26JPN",
  "blocks": [
    {
      "type": "rich_text",
      "block_id": "q56qa",
      "elements": [
        {
          "type": "rich_text_section",
          "elements": [
            {
              "type": "text",
              "text": "[TIL 7월 5주차]",
              "style": {
                "bold": true
              }
            },
            {
              "type": "text",
              "text": "\n"
            }
          ]
        }
      ]
    }
  ],
  "channel": "C07E4J5RRBG",
  "event_ts": "1722864232.958839",
  "channel_type": "channel"
}
```

채널에 메세지가 게시된 경우 위와 같이 요청 데이터가 옵니다. 이때 `type` 값이 message 인것을 확인하고 `blocks -> elements -> elements -> text`로 들어가서 [TIL N월 N주차] 글이 게시되었는지 확인합니다. 이외의 경우는 모두 무시해주고 TIL 챌린지 글이 경우에만 메세지 고유값인 `ts` 값을 저장해줍니다. 이것을 저장해주는 이유는 답글이 달린 경우, 리액션 추가 및 삭제, 답글 삭제 및 편집 이벤트가 왔을 때 TIL 챌린지 글에서 발생된 것인지 확인해주기 위함입니다.

### 2️⃣ 메세지에 답글이 달린 경우 이벤트

```json
{
  "user": "U07E89T5XB5",
  "type": "message",
  "ts": "1722865849.468459",
  "client_msg_id": "c5d6f753-660e-4ddf-b0d2-14515305c4d6",
  "text": "개발 블로그입니다 <https://velog.io/@deep-of-machine/Python-%EC%95%84%EB%82%98%EC%BD%98%EB%8B%A4-%EC%84%A4%EC%B9%98-Anaconda>",
  "team": "T07EDM26JPN",
  "thread_ts": "1722864232.958839",
  "parent_user_id": "U07E89T5XL5",
  "blocks": [
    {
      "type": "rich_text",
      "block_id": "d+1UX",
      "elements": [
        {
          "type": "rich_text_section",
          "elements": [
            {
              "type": "text",
              "text": "개발 블로그입니다 "
            },
            {
              "type": "link",
              "url": "https://velog.io/@deep-of-machine/Python-%EC%95%84%EB%82%98%EC%BD%98%EB%8B%A4-%EC%84%A4%EC%B9%98-Anaconda"
            }
          ]
        }
      ]
    }
  ],
  "channel": "C07E4J5RRBG",
  "event_ts": "1722865849.468459",
  "channel_type": "channel"
}
```

특정 글에 답글이 달린 경우에 오는 이벤트 데이터입니다. 데이터가 채널에 메세지가 게시된 경우와 비슷합니다. 하지만 답글의 경우에는 `thread_ts` 필드와 `parent_user_id` 필드가 추가되었습니다.

- `thread_ts`: 답글이 달린 메세지의 ts 값
- `parent_user_id`: 답글이 달린 메세지를 작성한 유저 아이디

저는 `parent_user_id` 필드를 통해 답글인지 채널에 게시된 글인지 확인해주었습니다. 이 필드가 존재하면 답글 이벤트이므로 TIL 챌린지 글에 작성된 답글인지 검사해주어야 합니다. 위에서 TIL 챌린지에 글의 `ts` 값을 저장해뒀는데요. 이 값과 `thread_ts` 값을 비교해서 TIL 챌린지 글에 작성된 답글인지 확인해주었습니다. 이 과정이 완료되면 답글에 대한 `ts`값도 저장해주었습니다. 또한, 메세지에 포함된 링크도 같이 검사해주었습니다. 챌린지에 참여하기 위해선 자신의 개발블로그(velog, github page, naver blog) 링크를 남겨야합니다. 그래서 데이터의 `type`: link 의 `url` 값을 가져와 개발 블로그를 제대로 남겼는지 검사해주었습니다. 만약 잘못된 링크를 올리거나 링크를 올리지 않았다면 저장된 데이터에 아래와 같이 `has_link` 필드로 링크를 남겼는지 표시해주었습니다.
###### 저장한 유저별 답글에 대한 데이터
```json
"1722776623.034429": {
	"total": 6,
	"has_link": true,
	"like": {
		"U07AU333WF3": 1,
		"U07AFCT3RNE": 1,
		"U07B462C21W": 1,
		"U07AHSX73U4": 1,
		"U07AC55UQ6R": 1,
		"U079ZD0D8TV": 1
	}
}
```

### 3️⃣ 리액션 추가, 삭제 이벤트

```json
{
  "type": "reaction_added",
  "user": "U07E89T5XB5",
  "reaction": "+1",
  "item": {
    "type": "message",
    "channel": "C07E4J5RRBG",
    "ts": "1722867166.951269"
  },
  "item_user": "U07E89T5XB5",
  "event_ts": "1722867172.000700"
}
```

채널에서 리액션이 추가되면 위와 같은 이벤트가 옵니다. 위의 리액션이 오면 `type` 필드로 구분하여 리액션 추가에 대한 로직이 처리되도록 해주었습니다. 또한, 이 챌린지는 👍 리액션만 집계하기로 정했으므로 `reaction` 값이 👍(+1)만 되게 해주었습니다.</br>
리액션 같은 경우에는 채널의 게시글에 리액션을 추가한 경우와 답글에 리액션을 추가한 경우에 오는 이벤트 데이터 필드가 똑같습니다. 그래서 리액션이 추가된 메세지가 채널의 게시글인지 답글인지 확인해줘야 했습니다. 다행히 리액션이 추가된 메세지의 `ts` 값이 같이 옵니다. 이를 통해 TIL 챌린지 답글이 달릴 때 저장해두었던 `ts` 값을 이벤트 요청 데이터의 `ts` 값과 비교해줌으로써 TIL 챌린지 글의 답글에 달린 리액션인지 확인한 후 추가해주었습니다.</br>
여기서 `item_user`가 바로 답글을 작성한 유저의 아이디이고, `user`가 리액션을 추가한 유저 아이디입니다. 먼저 `item_user`의 값을 사용해서 내 데이터에 있는 유저 정보를 로드한 후 답글의 `ts` 값 안에 리액션을 추가한 `user` 값을 저장해주었습니다.</br>
원래는 리액션 개수만 유지해줬으나, 유저 아이디까지 모두 유지해준 것은 [문제점과 개선한점.md](%EB%AC%B8%EC%A0%9C%EC%A0%90%EA%B3%BC%20%EA%B0%9C%EC%84%A0%ED%95%9C%EC%A0%90.md) 에서 말한 중복요청을 처리해주기 위함입니다. 리액션이 추가된 것을 데이터에 반영하기 전에 👍 리액션을 이미 남긴 유저아이디가 있는지 검사 후 없으면 추가하고, 있으면 다시 덮어씌여지게 해주었습니다.

```json
{
  "type": "reaction_removed",
  "user": "U07E89T5XB5",
  "reaction": "+1",
  "item": {
    "type": "message",
    "channel": "C07E4J5RRBG",
    "ts": "1722867166.951269"
  },
  "item_user": "U07E89T5XL5",
  "event_ts": "1722867655.000800"
}
```

리액션 삭제의 경우 `type` 값이 reaction_removed 로 옵니다. 이외의 필드는 추가한 경우와 모두 같으며 로직도 추가한 경우와 동일하게 처리해주었습니다. 대신 이경우엔 저장된 유저 아이디를 확인하고 있으면 지워주도록 해주었습니다.

### 4️⃣ 메세지가 삭제된 경우 이벤트

```json
{
  "type": "message",
  "subtype": "message_deleted",
  "previous_message": {
    "user": "U07E89T5XB5",
    "type": "message",
    "ts": "1722865849.468459",
    "client_msg_id": "c5d6f753-660e-4ddf-b0d2-14515305c4d6",
    "text": "개발 블로그입니다. <https://velog.io/@deep-of-machine/Python-%EC%95%84%EB%82%98%EC%BD%98%EB%A4-%EC%84%A4%EC%B9%98-Anaconda>",
    "team": "T07EDM26JPN",
    "thread_ts": "1722864232.958839",
    "parent_user_id": "U07E89T5XB5",
    "attachments": [
      {
        "from_url": "https://velog.io/@deep-of-machine/Python-%EC%95%84%EB%82%98%EC%B8%EB%8B%A4-%EC%84%A4%EC%B9%98-Anaconda",
        "image_url": "https://velog.velcdn.com/images/deep-of-machine/post/f4356ee7-3d51-4192-a04f-060e29e0efd4/image.png",
        "image_width": 1920,
        "image_height": 931,
        "image_bytes": 59779,
        "service_icon": "https://static.velog.io/favicons/apple-icon-152x152.png",
        "id": 1,
        "original_url": "https://velog.io/@deep-of-machine/Python-%EC%95%84%EB%82%98C%BDB%8B%A4-%EC%84%A4%EC%B9%98-Anaconda",
        "fallback": "[Python] - 아나콘다 설치 (Anaconda)",
        "text": "아나콘다 설치 및 사용 명령어",
        "title": "[Python] - 아나콘다 설치 (Anaconda)",
        "title_link": "https://velog.io/@deep-of-machine/Python-%EC%95%84%EB%82%98%EC%BD%98%%A4-%EC%84%A4%EC%B9%98-Anaconda",
        "service_name": "velog.io"
      }
    ],
    "blocks": [
      {
        "type": "rich_text",
        "block_id": "d+1UX",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "개발 블로그입니다 "
              },
              {
                "type": "link",
                "url": "https://velog.io/@deep-of-machine/Python-%EC%95%84%EB%82%98C%BD%9%8B%A4-%EC%84%A4%EC%B9%98-Anaconda"
              }
            ]
          }
        ]
      }
    ]
  },
  "channel": "C07E4J5RRBG",
  "hidden": true,
  "deleted_ts": "1722865849.468459",
  "event_ts": "1722866806.000300",
  "ts": "1722866806.000300",
  "channel_type": "channel"
}
```

메세지 삭제 시 오는 이벤트입니다. 메시지가 삭제된 경우엔 `subtype`: message_deleted 로 데이터가 오고 `previous_message` 필드 안에 삭제된 메세지에 대한 정보가 있습니다. 메세지를 삭제한 경우도 메세지를 게시한 경우와 마찬가지로 답글 메세지를 삭제한 경우 답글이 달린 글의 고유값 `thread_ts` 가 있습니다. 이 정보를 토대로 먼저 TIL 챌린지 글에 달린 답글인지 확인을 해주었습니다. 그리고 삭제된 메세지에 대한 `ts` 값을 사용하여 이 값이 데이터에 있는지 확인하고 있으면 챌린지 답글을 삭제한 것이므로 데이터에서 해당 챌린지 답글을 제거해주었습니다.

### 5️⃣ 메세지가 편집된 경우 이벤트

```json
{
  "type": "message",
  "subtype": "message_changed",
  "message": {
    "user": "U07E89T5XB5",
    "type": "message",
    "edited": {
      "user": "U07E89T5XB5",
      "ts": "1722868141.000000"
    },
    "client_msg_id": "866fc960-2a7b-462a-93ff-ddf4bc31daa3",
    "text": "편집함 ㅅㄱ\n<https://velog.io/@deep-of-machine/Python-%EC%95%84%EB%82%98%EC%BD%98%B%A4-%EC%84%A4%EC%B9%98-Anaconda>",
    "team": "T07EDM26JPN",
    "thread_ts": "1722864232.958839",
    "parent_user_id": "U07E89T5XL5",
    "attachments": [
      {
        "image_url": "https://velog.velcdn.com/images/deep-of-machine/post/f4357-3d51-4192-a04f-060e29e0efd4/image.png",
        "image_width": 1920,
        "image_height": 931,
        "image_bytes": 59779,
        "from_url": "https://velog.io/@deep-of-machine/Python-%EC%95%84%EB%82%98%EC%B8%EB%8B%A4-%EC%84%A4%EC%B9%98-Anaconda",
        "service_icon": "https://static.velog.io/favicons/apple-icon-152x152.png",
        "id": 1,
        "original_url": "https://velog.io/@deep-of-machine/Python-%EC%95%84%EB%82%98%EC%BD%98%EB%8B-%EC%84%A4%EC%B9%98-Anaconda",
        "fallback": "[Python] - 아나콘다 설치 (Anaconda)",
        "text": "아나콘다 설치 및 사용 명령어",
        "title": "[Python] - 아나콘다 설치 (Anaconda)",
        "title_link": "https://velog.io/@deep-of-machine/Python-%EC%95%84%EB%82%98%EC%BD%EB%8B%A4-%EC%84%A4%EC%B9%98-Anaconda",
        "service_name": "velog.io"
      }
    ],
    "blocks": [
      {
        "type": "rich_text",
        "block_id": "HQ12e",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "편집함 ㅅㄱ\n"
              },
              {
                "type": "link",
                "url": "https://velog.io/@deep-of-machine/Python-%EC%95%84%EB%82%98%EC%BD%98%EB%8B%AEC%84%A4%EC%B9%98-Anaconda"
              }
            ]
          }
        ]
      }
    ],
    "ts": "1722867166.951269",
    "source_team": "T07EDM26JPN",
    "user_team": "T07EDM26JPN"
  },
  "previous_message": {
    "user": "U07E89T5XB5",
    "type": "message",
    "ts": "1722867166.951269",
    "client_msg_id": "866fc960-2a7b-462a-93ff-ddf4bc31daa3",
    "text": "아오 ㅋ\n<https://velog.io/@deep-of-machine/Python-%EC%95%84%EB%82%98%EC%B8%EB%8B%A4-%EC%84%A4%EC%B9%98-Anaconda>",
    "team": "T07EDM26JPN",
    "thread_ts": "1722864232.958839",
    "parent_user_id": "U07E89T5XL5",
    "attachments": [
      {
        "image_url": "https://velog.velcdn.com/images/deep-of-machine/post/f43e7-3d51-4192-a04f-060e29e0efd4/image.png",
        "image_width": 1920,
        "image_height": 931,
        "image_bytes": 59779,
        "from_url": "https://velog.io/@deep-of-machine/Python-%EC%95%84%EB%82%98%ED%98%EB%8B%A4-%EC%84%A4%EC%B9%98-Anaconda",
        "service_icon": "https://static.velog.io/favicons/apple-icon-152x152.png",
        "id": 1,
        "original_url": "https://velog.io/@deep-of-machine/Python-%EC%95%84%EB%%EC%BD%98%EB%8B%A4-%EC%84%A4%EC%B9%98-Anaconda",
        "fallback": "[Python] - 아나콘다 설치 (Anaconda)",
        "text": "아나콘다 설치 및 사용 명령어",
        "title": "[Python] - 아나콘다 설치 (Anaconda)",
        "title_link": "https://velog.io/@deep-of-machine/Python-%EC%95%84%EB%82%98%EC%BD%98%EB%8B%A4-%EC%84%C%B9%98-Anaconda",
        "service_name": "velog.io"
      }
    ],
    "blocks": [
      {
        "type": "rich_text",
        "block_id": "ZBAQX",
        "elements": [
          {
            "type": "rich_text_section",
            "elements": [
              {
                "type": "text",
                "text": "아오 ㅋ\n"
              },
              {
                "type": "link",
                "url": "https://velog.io/@deep-of-machine/Python-%EC%95%84%EB%82%98%EC%BD%%EB%8B%A4-%E4%A4%EC%B9%98-Anaconda"
              }
            ]
          }
        ]
      }
    ]
  },
  "channel": "C07E4J5RRBG",
  "hidden": true,
  "ts": "1722868141.001000",
  "event_ts": "1722868141.001000",
  "channel_type": "channel"
}
```

이 이벤트 데이터가 가장 보기 힘들었습니다. 편집된 경우엔 `subtype`: message_changed 로 데이터가 오며 `message` 필드에 편집된 메세지 정보가 있고, `previous_message` 필드에 편집되기 전 메세지 정보가 들어있습니다. 이 또한 마찬가지로 답글을 편집한 경우엔 `thread_ts` 값이 존재합니다. 이 값으로 TIL 챌린지 글인지 우선 확인해주었습니다. 그리고 사용자가 답글에 개발 블로그 링크를 같이 올리지 않고 텍스트만 올렸다가 편집을 통해 링크를 다시 올린 경우라면 편집해서 올린 link가 velog, github page, naver blog 인지 검사 후 챌린지 참여여부를 반영해주었습니다.</br>

위의 내용을 정리하면 아래와 같습니다.

1. 채널에 메세지가 게시된 경우
   - [TIL N월 N주차] 메세지가 포함되었는지 검사하여 챌린지 게시글인지 확인
   - 확인이 되었으면 각 유저 데이터마다 해당 메세지의 `ts`값을 저장
2. 답글이 달린 경우
   - `thread_ts` 값으로 TIL 챌린지 게시글에 달린 답글인지 확인
   - 링크를 넣었는지 그리고 링크가 velog, github page, naver blog 인지 확인
   - 모두 확인되면 Slack 채널에 답글을 남긴 사용자가 참여했다고 메세지 전송
   - 개발 블로그 링크를 남기지 않으면 참여 메세지가 전송되지 않음
3. 리액션 추가 및 삭제
   - `reaction` 이 👍 인 경우에만 처리
   - 리액션을 남긴 사용자 아이디가 이미 데이터에 존재하는지 확인(중복 요청 방지 위함)
   - 없으면 유저 아이디와 함께 추가해줌
   - 삭제의 경우도 동일
4. 메세지 삭제 경우
   - `thread_ts` 값이 있는 경우 이 값을 통해 TIL 챌린지 글에 작성된 답글인지 확인
   - 삭제된 메세지의 `ts`값이 데이터 존재하는지 확인
   - 존재하면 삭제 처리
5. 메세지 편집된 경우
   - `thread_ts` 값이 있는 경우 이 값을 통해 TIL 챌린지 글에 작성된 답글인지 확인
   - 텍스트만 작성했다가 편집해서 개발 블로그 링크를 올린 경우 velog, github page, naver blog 인지 확인
   - 링크를 제대로 올렸다면 참여되었다고 반영하고 Slack 채널에 답글을 남긴 사용자가 참여했다고 메세지 전송
