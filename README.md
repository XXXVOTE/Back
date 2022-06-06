# UOSVOTE 검증 절차

사용자가 투표한 결과 벡터의 암호문은 공개된 네트워크인 IPFS에 등록됩니다.
https://gateway.pinata.cloud/ipfs/HASHVALUE 를 통해 웹에서 확인할 수 있는 해쉬값에 대한 암호문을 다운로드 받을 수 있습니다.

암호문을 만들 때 사용되는 공개키는 아마존 S3에 저장되어 있습니다.
https://uosvotepk.s3.ap-northeast-2.amazonaws.com/election/ELECTIONID/ELECTIONID-ENCRYPTION.txt 의 형식으로 ELECTIONID로 다운로드할 수 있습니다.

UosVote는 HEAAN 라이브러리를 이용해 바이너리를 만들었습니다.
Ubuntu 환경에서 NTL 라이브러리를 필요로 합니다.
UosVote 파일을 다운로드받고 같은 경로상에 cipher 폴더를 만들어 모든 암호문을 다운로드 받습니다.
./UosVote addBallots 를 명령어로 입력하면 UosVote가 포함된 경로상에 RESULT 파일이 만들어집니다.

투표 결과창에 있는 최종 RESULT 파일을 다운로드 받아 두 파일에 대한 해쉬값을 비교하면 같은 결과를 얻을 수 있습니다.
다른 파일을 추가하거나 모두 포함하여 덧셈 연산을 하지 않으면 같은 해쉬값을 구할 수 없습니다.
