$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginBody = @{email='checkout-test@example.com'; password='Password123!'} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:4000/api/users/login' -Method Post -ContentType 'application/json' -Body $loginBody -WebSession $session
$csrf = ($session.Cookies.GetCookies('http://localhost:4000') | Where-Object { $_.Name -eq '_csrf_token' }).Value
$headers = @{ 'X-CSRF-Token' = $csrf }
$itemBody = @{ProductType='Service'; ProductId=210; description='Test Service'; unitPrice=100; quantity=1; metadata=@{ScheduledServiceId=210}} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:4000/api/cart/items' -Method Post -ContentType 'application/json' -Body $itemBody -WebSession $session -Headers $headers
$cart = Invoke-RestMethod -Uri 'http://localhost:4000/api/cart/' -Method Get -WebSession $session
$checkoutBody = @{cartId=$cart.data.cart.id; billingInfo=@{email='test@example.com'; name='Test User'; address='1 Main St'; city='Testville'; state='TS'; postalCode='12345'}} | ConvertTo-Json
$response = Invoke-RestMethod -Uri 'http://localhost:4000/api/cart/checkout' -Method Post -ContentType 'application/json' -Body $checkoutBody -WebSession $session -Headers $headers
$response | ConvertTo-Json -Depth 10
