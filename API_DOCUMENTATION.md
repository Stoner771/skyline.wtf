# SkyLineentication API Documentation

This document provides comprehensive documentation for integrating the SkyLineentication API with your C++ application.

## Base URL
```
http://localhost:8000/api
```

## Typical Workflow

1. **Admin creates license keys** in the admin panel
2. **Users register with license keys** to create accounts
3. **Users login** with username/password after registration
4. **Alternative: Direct license login** (creates account automatically)

## Authentication Methods

The API supports these authentication methods:
1. **User Registration with License Key** (Primary method - create account with license)
2. **Username/Password Login** (After registration)
3. **Direct License Key Login** (Creates account automatically if not exists)

---

## Step 1: Create License Keys (Admin Panel)

Before users can register, you need to create license keys in the admin panel:

1. Log in to admin panel: `http://localhost:5173/login`
2. Navigate to **Licenses** page
3. Click **Generate Licenses**
4. Select your application
5. Choose duration (or lifetime)
6. Specify count (how many licenses to generate)
7. Click **Generate**

License keys will be displayed. Share these with your users for registration.

---

## Step 2: Initialize Application (Client)

Before making any requests, initialize your application to check version and force update status.

### Endpoint
```
POST /init
```

### Request Body
```json
{
  "app_secret": "your_app_secret_here"
}
```

### Response
```json
{
  "force_update": false,
  "latest_version": "1.0.0",
  "version": "1.0.0"
}
```

### C++ Example (Using cURL)
```cpp
#include <curl/curl.h>
#include <string>
#include <iostream>

struct Response {
    std::string data;
};

size_t WriteCallback(void* contents, size_t size, size_t nmemb, Response* response) {
    size_t totalSize = size * nmemb;
    response->data.append((char*)contents, totalSize);
    return totalSize;
}

std::string initializeApp(const std::string& appSecret) {
    CURL* curl = curl_easy_init();
    Response response;
    
    if (curl) {
        std::string url = "http://localhost:8000/api/init";
        std::string jsonData = "{\"app_secret\":\"" + appSecret + "\"}";
        
        struct curl_slist* headers = NULL;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, jsonData.c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        
        CURLcode res = curl_easy_perform(curl);
        curl_easy_cleanup(curl);
        curl_slist_free_all(headers);
        
        if (res == CURLE_OK) {
            return response.data;
        }
    }
    return "";
}
```

---

## Step 3: User Registration with License Key (Primary Method)

This is the recommended method. Users register with a license key you've created.

### Endpoint
```
POST /register
```

### Request Body
```json
{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com",
  "hwid": "unique_hardware_id",
  "license_key": "ABC123-XYZ789-DEF456",
  "app_secret": "your_app_secret_here"
}
```

### Response
```json
{
  "success": true,
  "message": "Registration successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiry": 1234567890
}
```

### C++ Example
```cpp
LoginResult registerWithLicense(const std::string& username, const std::string& password,
                                 const std::string& email, const std::string& hwid,
                                 const std::string& licenseKey, const std::string& appSecret) {
    CURL* curl = curl_easy_init();
    Response response;
    LoginResult result;
    
    if (curl) {
        nlohmann::json jsonData = {
            {"username", username},
            {"password", password},
            {"email", email},
            {"hwid", hwid},
            {"license_key", licenseKey},
            {"app_secret", appSecret}
        };
        
        std::string jsonStr = jsonData.dump();
        
        struct curl_slist* headers = NULL;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        
        curl_easy_setopt(curl, CURLOPT_URL, "http://localhost:8000/api/register");
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, jsonStr.c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        
        CURLcode res = curl_easy_perform(curl);
        
        if (res == CURLE_OK) {
            auto json = nlohmann::json::parse(response.data);
            result.success = json["success"];
            result.token = json["token"];
            result.expiry = json["expiry"];
            result.message = json["message"];
        }
        
        curl_easy_cleanup(curl);
        curl_slist_free_all(headers);
    }
    
    return result;
}
```

**Important Notes:**
- The license key must be created first in the admin panel
- License will be bound to the user's HWID on registration
- If license has expiry date, user subscription will match license expiry
- User receives a JWT token immediately after successful registration

---

## Step 4: Username/Password Login (After Registration)

### Endpoint
```
POST /login
```

### Request Body
```json
{
  "username": "user123",
  "password": "password123",
  "hwid": "unique_hardware_id",
  "app_secret": "your_app_secret_here"
}
```

### Response
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiry": 1234567890
}
```

### C++ Example
```cpp
#include <nlohmann/json.hpp>

struct LoginResult {
    bool success;
    std::string token;
    long expiry;
    std::string message;
};

LoginResult login(const std::string& username, const std::string& password, 
                  const std::string& hwid, const std::string& appSecret) {
    CURL* curl = curl_easy_init();
    Response response;
    LoginResult result;
    
    if (curl) {
        nlohmann::json jsonData = {
            {"username", username},
            {"password", password},
            {"hwid", hwid},
            {"app_secret", appSecret}
        };
        
        std::string jsonStr = jsonData.dump();
        
        struct curl_slist* headers = NULL;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        
        curl_easy_setopt(curl, CURLOPT_URL, "http://localhost:8000/api/login");
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, jsonStr.c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        
        CURLcode res = curl_easy_perform(curl);
        
        if (res == CURLE_OK) {
            auto json = nlohmann::json::parse(response.data);
            result.success = json["success"];
            result.token = json["token"];
            result.expiry = json["expiry"];
            result.message = json["message"];
        }
        
        curl_easy_cleanup(curl);
        curl_slist_free_all(headers);
    }
    
    return result;
}
```

---

## Alternative: Direct License Key Login (No Registration Required)

Users can login directly with a license key without explicit registration. The system will create an account automatically if one doesn't exist.

### Endpoint
```
POST /license
```

### Request Body
```json
{
  "license_key": "ABC123-XYZ789-DEF456",
  "hwid": "unique_hardware_id",
  "app_secret": "your_app_secret_here"
}
```

### Response
```json
{
  "success": true,
  "message": "License authentication successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiry": 1234567890
}
```

### C++ Example
```cpp
LoginResult licenseLogin(const std::string& licenseKey, const std::string& hwid, 
                        const std::string& appSecret) {
    CURL* curl = curl_easy_init();
    Response response;
    LoginResult result;
    
    if (curl) {
        nlohmann::json jsonData = {
            {"license_key", licenseKey},
            {"hwid", hwid},
            {"app_secret", appSecret}
        };
        
        std::string jsonStr = jsonData.dump();
        
        struct curl_slist* headers = NULL;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        
        curl_easy_setopt(curl, CURLOPT_URL, "http://localhost:8000/api/license");
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, jsonStr.c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        
        CURLcode res = curl_easy_perform(curl);
        
        if (res == CURLE_OK) {
            auto json = nlohmann::json::parse(response.data);
            result.success = json["success"];
            result.token = json["token"];
            result.expiry = json["expiry"];
            result.message = json["message"];
        }
        
        curl_easy_cleanup(curl);
        curl_slist_free_all(headers);
    }
    
    return result;
}
```

---

## Alternative: Registration Without License (Not Recommended)

Users can also register without a license key, but they won't get premium subscription benefits. Simply omit the `license_key` field.

### Request Body (Without License)
```json
{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com",
  "hwid": "unique_hardware_id",
  "app_secret": "your_app_secret_here"
}
```

**Note:** For premium features and subscription access, always include a valid `license_key` obtained from the admin panel during registration.

---

## Step 5: Validate Token

After login, use this endpoint to validate your token and get user information.

### Endpoint
```
GET /validate
```

### Headers
```
Authorization: Bearer your_token_here
```

### Response
```json
{
  "user_id": 1,
  "username": "user123",
  "email": "user@example.com",
  "subscription_name": "Premium",
  "expiry_timestamp": 1234567890,
  "is_active": true
}
```

### C++ Example
```cpp
#include <string>

struct UserInfo {
    int userId;
    std::string username;
    std::string email;
    std::string subscriptionName;
    long expiryTimestamp;
    bool isActive;
};

UserInfo validateToken(const std::string& token) {
    CURL* curl = curl_easy_init();
    Response response;
    UserInfo userInfo;
    
    if (curl) {
        std::string authHeader = "Authorization: Bearer " + token;
        
        struct curl_slist* headers = NULL;
        headers = curl_slist_append(headers, authHeader.c_str());
        
        curl_easy_setopt(curl, CURLOPT_URL, "http://localhost:8000/api/validate");
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        
        CURLcode res = curl_easy_perform(curl);
        
        if (res == CURLE_OK) {
            auto json = nlohmann::json::parse(response.data);
            userInfo.userId = json["user_id"];
            userInfo.username = json["username"];
            userInfo.email = json["email"];
            userInfo.subscriptionName = json["subscription_name"];
            userInfo.expiryTimestamp = json["expiry_timestamp"];
            userInfo.isActive = json["is_active"];
        }
        
        curl_easy_cleanup(curl);
        curl_slist_free_all(headers);
    }
    
    return userInfo;
}
```

---

## Step 6: Get Variables

Retrieve application-specific variables.

### Endpoint
```
GET /vars?app_secret=your_app_secret_here
```

### Response
```json
{
  "variable1": "value1",
  "variable2": "value2"
}
```

---

## Step 7: Get Files List

Get list of available files for your application.

### Endpoint
```
GET /files?app_secret=your_app_secret_here
```

### Response
```json
[
  {
    "id": 1,
    "filename": "update.exe",
    "url": "/api/files/download/1?secret=your_app_secret",
    "size": 1024000,
    "mime_type": "application/octet-stream"
  }
]
```

---

## Step 8: Download File

Download a specific file.

### Endpoint
```
GET /files/download/{file_id}?secret=your_app_secret_here
```

### Response
Binary file content

---

## Error Responses

All endpoints may return errors in the following format:

```json
{
  "detail": "Error message here"
}
```

### Common HTTP Status Codes
- `200 OK` - Success
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Invalid credentials or token
- `403 Forbidden` - Account banned, HWID mismatch, or license expired
- `404 Not Found` - Resource not found

---

## Complete C++ Integration Example

```cpp
#include <curl/curl.h>
#include <nlohmann/json.hpp>
#include <string>
#include <iostream>

class SkyLineAuth {
private:
    std::string baseUrl = "http://localhost:8000/api";
    std::string appSecret;
    std::string currentToken;
    
    struct Response {
        std::string data;
        long statusCode;
    };
    
    static size_t WriteCallback(void* contents, size_t size, size_t nmemb, Response* response) {
        size_t totalSize = size * nmemb;
        response->data.append((char*)contents, totalSize);
        return totalSize;
    }
    
    Response makeRequest(const std::string& endpoint, const std::string& method, 
                        const std::string& data = "", const std::string& token = "") {
        CURL* curl = curl_easy_init();
        Response response;
        response.statusCode = 0;
        
        if (curl) {
            std::string url = baseUrl + endpoint;
            
            struct curl_slist* headers = NULL;
            headers = curl_slist_append(headers, "Content-Type: application/json");
            if (!token.empty()) {
                std::string authHeader = "Authorization: Bearer " + token;
                headers = curl_slist_append(headers, authHeader.c_str());
            }
            
            curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
            curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
            
            if (method == "POST") {
                curl_easy_setopt(curl, CURLOPT_POSTFIELDS, data.c_str());
            }
            
            curl_easy_setopt(curl, CURLOPT_HTTPGET, method == "GET" ? 1L : 0L);
            
            CURLcode res = curl_easy_perform(curl);
            if (res == CURLE_OK) {
                curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response.statusCode);
            }
            
            curl_easy_cleanup(curl);
            curl_slist_free_all(headers);
        }
        
        return response;
    }
    
public:
    SkyLineAuth(const std::string& secret) : appSecret(secret) {}
    
    bool login(const std::string& username, const std::string& password, const std::string& hwid) {
        nlohmann::json jsonData = {
            {"username", username},
            {"password", password},
            {"hwid", hwid},
            {"app_secret", appSecret}
        };
        
        Response response = makeRequest("/login", "POST", jsonData.dump());
        
        if (response.statusCode == 200) {
            auto json = nlohmann::json::parse(response.data);
            currentToken = json["token"];
            return json["success"];
        }
        
        return false;
    }
    
    bool licenseLogin(const std::string& licenseKey, const std::string& hwid) {
        nlohmann::json jsonData = {
            {"license_key", licenseKey},
            {"hwid", hwid},
            {"app_secret", appSecret}
        };
        
        Response response = makeRequest("/license", "POST", jsonData.dump());
        
        if (response.statusCode == 200) {
            auto json = nlohmann::json::parse(response.data);
            currentToken = json["token"];
            return json["success"];
        }
        
        return false;
    }
    
    std::string getToken() const {
        return currentToken;
    }
    
    bool registerUser(const std::string& username, const std::string& password,
                      const std::string& email, const std::string& hwid,
                      const std::string& licenseKey) {
        nlohmann::json jsonData = {
            {"username", username},
            {"password", password},
            {"email", email},
            {"hwid", hwid},
            {"license_key", licenseKey},
            {"app_secret", appSecret}
        };
        
        Response response = makeRequest("/register", "POST", jsonData.dump());
        
        if (response.statusCode == 200) {
            auto json = nlohmann::json::parse(response.data);
            currentToken = json["token"];
            return json["success"];
        }
        
        return false;
    }
    
    bool validateToken() {
        if (currentToken.empty()) return false;
        
        Response response = makeRequest("/validate", "GET", "", currentToken);
        return response.statusCode == 200;
    }
};

// Usage Example - Typical Workflow
int main() {
    curl_global_init(CURL_GLOBAL_DEFAULT);
    
    SkyLineAuth auth("your_app_secret_here");
    std::string licenseKey = "ABC123-XYZ789-DEF456";  // License created in admin panel
    std::string hwid = getHWID();
    
    // Step 1: Register with license key (creates account)
    if (auth.registerUser("username", "password123", "user@example.com", hwid, licenseKey)) {
        std::cout << "Registration successful! Token: " << auth.getToken() << std::endl;
        
        // Step 2: Validate token
        if (auth.validateToken()) {
            std::cout << "Token is valid!" << std::endl;
        }
    } else {
        std::cout << "Registration failed!" << std::endl;
    }
    
    // Step 3: Future logins use username/password
    // if (auth.login("username", "password123", hwid)) {
    //     std::cout << "Login successful!" << std::endl;
    // }
    
    curl_global_cleanup();
    return 0;
}
```

---

## Getting Your App Secret

1. Log in to the admin panel at `http://localhost:5173/login`
2. Navigate to **Applications**
3. Create a new application or select an existing one
4. Copy the **Secret** value (displayed in the Applications table)

## Complete Workflow Summary

### For Administrators:
1. **Create Application** in admin panel → Get `app_secret`
2. **Generate License Keys** in admin panel → Get license keys
3. **Distribute license keys** to users

### For End Users (C++ Application):
1. **Initialize** → Check version/updates
2. **Register with License Key** → Create account with license
3. **Login** → Use username/password for subsequent logins
4. **Validate Token** → Verify authentication
5. **Access protected resources** → Use token for API calls

### Quick Start Example:
```cpp
// 1. Initialize app
std::string appSecret = "your_app_secret_from_admin_panel";
std::string licenseKey = "ABC123-XYZ789-DEF456";  // From admin

// 2. Register user with license
SkyLineAuth auth(appSecret);
if (auth.registerUser("myuser", "mypass", "email@example.com", getHWID(), licenseKey)) {
    // User registered and authenticated!
    std::string token = auth.getToken();
    // Store token for future use
}
```

---

## HWID Generation (C++)

You'll need to generate a unique hardware ID. Here's a simple example:

```cpp
#include <windows.h>
#include <string>

std::string getHWID() {
    std::string hwid = "";
    
    // Get Volume Serial Number
    DWORD serialNumber;
    if (GetVolumeInformationA("C:\\", NULL, 0, &serialNumber, NULL, NULL, NULL, 0)) {
        hwid += std::to_string(serialNumber);
    }
    
    // Get Computer Name
    char computerName[MAX_COMPUTERNAME_LENGTH + 1];
    DWORD size = sizeof(computerName);
    if (GetComputerNameA(computerName, &size)) {
        hwid += computerName;
    }
    
    // You can add more hardware identifiers here
    // (CPU ID, MAC address, etc.)
    
    return hwid;
}
```

---

## Dependencies

For the C++ examples above, you'll need:

1. **libcurl** - For HTTP requests
   - Windows: Download from https://curl.se/windows/
   - Linux: `sudo apt-get install libcurl4-openssl-dev`

2. **nlohmann/json** - For JSON parsing
   - Download from https://github.com/nlohmann/json
   - Single header file: `json.hpp`

---

## Notes

- **License keys must be created first** in the admin panel before users can register with them
- Always store tokens securely (encrypted storage recommended)
- Check token expiry before making authenticated requests
- Handle network errors gracefully
- Use HTTPS in production (replace `http://localhost:8000` with your production URL)
- HWID should be generated consistently for the same machine
- One license key can only be used by one user (bound to HWID)
- License keys with expiry dates will set the user's subscription expiry accordingly

## Recommended Integration Flow

1. **Application Start:**
   - Generate/retrieve HWID
   - Initialize application (check version, force updates)

2. **First Time User (Registration):**
   - Prompt user for license key (you created in admin panel)
   - Collect username, password, email
   - Call `/register` with license key
   - Store received JWT token securely

3. **Returning User (Login):**
   - Retrieve stored credentials or prompt user
   - Call `/login` with username, password, HWID
   - Store received JWT token securely

4. **Session Management:**
   - Validate token periodically with `/validate`
   - Refresh token before expiry
   - Handle expired/invalid tokens gracefully

5. **Optional: Direct License Login:**
   - For simpler flow, users can use `/license` endpoint
   - Creates account automatically if needed
   - Returns token immediately

