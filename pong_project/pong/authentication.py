from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings
from rest_framework.authentication import CSRFCheck
from rest_framework import exceptions

class JWTCookieAuthentication(JWTAuthentication):
    """
    クッキーベースのJWT認証クラス
    """
    def authenticate(self, request):
        header = self.get_header(request)
        
        # ヘッダーからトークンを取得しない場合、クッキーからトークンを取得
        if not header:
            raw_token = request.COOKIES.get(settings.SIMPLE_JWT['AUTH_COOKIE'])
            if raw_token is None:
                return None
                
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
            
        return super().authenticate(request)
        
    def enforce_csrf(self, request):
        """
        CSRFトークンの検証を強制する
        """
        check = CSRFCheck()
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise exceptions.PermissionDenied('CSRF Failed: %s' % reason) 