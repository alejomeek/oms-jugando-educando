Certificando las solicitudes
Todas las solicitudes enviadas al servidor deben estar firmadas criptográficamente.

En lo que respecta a las medidas de seguridad, muchas API se contentan con solo tener una clave de API o un nombre de usuario como parámetro cuando se llama a un endpoint. El peligro con ese esquema es la capacidad de alguien de robar el token de la API y luego hacer sus propias llamadas con él.

Para un sistema como Falabella Seller Center, que administra grandes sumas de dinero, tuvimos que elegir un enfoque más seguro: la clave API nunca sale de su computadora y solo se usa para firmar la solicitud.

Además, para asegurarse de que las llamadas a la API no se puedan grabar y reproducir, uno de los parámetros que se firman es una marca de tiempo (timestamp).

Más específicamente, el parámetro de firma que requerimos en todas las llamadas es el hash SHA256 de la cadena de solicitud.

Más específicamente, el parámetro de firma que requerimos en todas las llamadas es el HMAC de la cadena de solicitud y su clave API con el algoritmo de resumen SHA256.

Entonces, veamos cómo se implementa la firma:

Clave de la API (API Key)
Primero necesitamos nuestras credenciales para poder operar, para aquello puedes ver el apartado de ¿Cómo Obtener Tus Credenciales? Obtener Credenciales

Calcular el parámetro Signature
La cadena para firmar es ...

el resultado concatenado de todos los parámetros de la solicitud,
ordenados por nombre,
incluyendo parámetros opcionales,
y excluyendo el parámetro Signature.
Los nombres y valores deben estar codificados en la URL de acuerdo con el estándar RFC 3986, concatenados con el carácter '='. Cada conjunto de parámetros (nombre = valor) debe separarse con el carácter '&'.

La siguiente es el PHP de la implementación de referencia:

PHP

<?php

// Pay no attention to this statement.
// It's only needed if timezone in php.ini is not set correctly.
date_default_timezone_set("UTC");

// The current time. Needed to create the Timestamp parameter below.
$now = new DateTime();

// The parameters for our GET request. These will get signed.
$parameters = array(
    // The user ID for which we are making the call.
    'UserID' => 'look@me.com',

    // The API version. Currently must be 1.0
    'Version' => '1.0',

    // The API method to call.
    'Action' => 'FeedList',

    // The format of the result.
    'Format' => 'XML',

    // The current time formatted as ISO8601
    'Timestamp' => $now->format(DateTime::ISO8601)
);

// Sort parameters by name.
ksort($parameters);

// URL encode the parameters.
$encoded = array();
foreach ($parameters as $name => $value) {
    $encoded[] = rawurlencode($name) . '=' . rawurlencode($value);
}

// Concatenate the sorted and URL encoded parameters into a string.
$concatenated = implode('&', $encoded);

// The API key for the user as generated in the Seller Center GUI.
// Must be an API key associated with the UserID parameter.
$api_key = 'b1bdb357ced10fe4e9a69840cdd4f0e9c03d77fe';

// Compute signature and add it to the parameters.
$parameters['Signature'] =
    rawurlencode(hash_hmac('sha256', $concatenated, $api_key, false));
Si desea verificar la referencia anterior, reemplace el timestamp con el siguiente valor ...

PHP

'Timestamp' => '2015-07-01T11:11:11+00:00'
... y debería obtener las siguientes entradas en $parameters:

Text

Action=FeedList
Format=XML
Timestamp=2015-07-01T11:11:11+00:00
UserID=look@me.com
Version=1.0
Signature=3ceb8ed91049dfc718b0d2d176fb2ed0e5fd74f76c5971f34cdab48412476041
Para luego realizar la solicitud GET en PHP, debe escribir algo como esto:

PHP

<?php

// ...continued from above

// Replace with the URL of your API host.
$url = "https://sellercenter-api.falabella.com/";

// Build Query String
$queryString = http_build_query($parameters, '', '&', PHP_QUERY_RFC3986);

// Open cURL connection
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url."?".$queryString);

// Save response to the variable $data
curl_setopt($ch, CURLOPT_FOLLOWLOCATION,1);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
$data = curl_exec($ch);

// Close Curl connection
curl_close($ch);
Si está más familiarizado con otros lenguajes de programación, aquí hay implementaciones en ...

Java
Python
Visual Basic
Cold Fusion
Llamada a la API en Java
Java

/*
  * Sample Interface for Seller Center API
  */
package com.rocket.sellercenter;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.text.SimpleDateFormat;
import java.text.DateFormat;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public class SellercenterAPI {
  private static final String ScApiHost = "https://sellercenter-api.falabella.com/"; 
  private static final String HASH_ALGORITHM = "HmacSHA256";
  private static final String CHAR_UTF_8 = "UTF-8";
  private static final String CHAR_ASCII = "ASCII";
  public static void main(String[] args) {
    Map<String, String> params = new HashMap<String, String>();
    params.put("UserID", "example@example.com");
    params.put("Timestamp", getCurrentTimestamp());
    params.put("Version", "1.0");
    params.put("Action", "ProductUpdate");
    final String apiKey = "55f86f79f3b4388507aba8c21a7bfd0d25626551";
    final String XML = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?
      ><Request><Product><SellerSku>4105382173aaee4</SellerSku><Price>12</Price></Product></Request>";
      final String out = getSellercenterApiResponse(params, apiKey, XML); // provide XML as an empty string
    when not needed
      System.out.println(out); // print out the XML response
  }

  /**
  * calculates the signature and sends the request
  *
  * @param params Map - request parameters
  * @param apiKey String - user's API Key
  * @param XML String - Request Body
  */
  public static String getSellercenterApiResponse(Map<String, String> params, String apiKey, String XML) {
    String queryString = "";
    String Output = "";
    HttpURLConnection connection = null;
    URL url = null;
    Map<String, String> sortedParams = new TreeMap<String, String>(params);
    queryString = toQueryString(sortedParams);
    final String signature = hmacDigest(queryString, apiKey, HASH_ALGORITHM);
    queryString = queryString.concat("&Signature=".concat(signature));
    final String request = ScApiHost.concat("?".concat(queryString));
    try {
      url = new URL(request);
      connection = (HttpURLConnection) url.openConnection();
      connection.setDoOutput(true);
      connection.setDoInput(true);
      connection.setInstanceFollowRedirects(false);
      connection.setRequestMethod("POST");
      connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
      connection.setRequestProperty("charset", CHAR_UTF_8);
      connection.setUseCaches(false);
      if (!XML.equals("")) {
        connection.setRequestProperty("Content-Length", "" + Integer.toString(XML.getBytes().length));
        DataOutputStream wr = new DataOutputStream(connection.getOutputStream());
        wr.writeBytes(XML);
        wr.flush();
        wr.close();
      }
      String line;
      BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
      while ((line = reader.readLine()) != null) {
        Output += line + "\n";
      }
    } catch (Exception e) {
      e.printStackTrace();
    }
    return Output;
  }

  /**
  * generates hash key
  *
  * @param msg
  * @param keyString
  * @param algo
  * @return string
  */
  private static String hmacDigest(String msg, String keyString, String algo) {
    String digest = null;
    try {
      SecretKeySpec key = new SecretKeySpec((keyString).getBytes(CHAR_UTF_8), algo);
      Mac mac = Mac.getInstance(algo);
      mac.init(key);
      final byte[] bytes = mac.doFinal(msg.getBytes(CHAR_ASCII));
      StringBuffer hash = new StringBuffer();
      for (int i = 0; i < bytes.length; i++) {
        String hex = Integer.toHexString(0xFF & bytes[i]);
        if (hex.length() == 1) {
          hash.append('0');
        }
        hash.append(hex);
      }
      digest = hash.toString();
    } catch (UnsupportedEncodingException e) {
      e.printStackTrace();
    } catch (InvalidKeyException e) {
      e.printStackTrace();
    } catch (NoSuchAlgorithmException e) {
      e.printStackTrace();
    }
    return digest;
  }
  
  /**
  * build querystring out of params map
  *
  * @param data map of params
  * @return string
  * @throws UnsupportedEncodingException
  */
  private static String toQueryString(Map<String, String> data) {
    String queryString = "";
    try{
      StringBuffer params = new StringBuffer();
      for (Map.Entry<String, String> pair : data.entrySet()) {
        params.append(URLEncoder.encode((String) pair.getKey(), CHAR_UTF_8) + "=");
        params.append(URLEncoder.encode((String) pair.getValue(), CHAR_UTF_8) + "&");
      }
      if (params.length() > 0) {
        params.deleteCharAt(params.length() - 1);
      }
      queryString = params.toString();
    } catch(UnsupportedEncodingException e){
      e.printStackTrace();
    }
    return queryString;
  }
  
  /**
  * returns the current timestamp
  * @return current timestamp in ISO 8601 format
  */
  private static String getCurrentTimestamp(){
    final TimeZone tz = TimeZone.getTimeZone("UTC");
    final DateFormat df = new SimpleDateFormat("yyyy-MM-dd'T'HH:mmZ");
    df.setTimeZone(tz);
    final String nowAsISO = df.format(new Date());
    return nowAsISO;
  }
}
Llamada a la API en Python
Python

import requests
import urllib.parse
from hashlib import sha256
from hmac import HMAC
from datetime import datetime

def generate_signature(api_key, parameters):
    """
    Generates an HMAC-SHA256 signature for API requests.

    Args:
        api_key (str): Your API key provided by the service.
        parameters (dict): A dictionary containing request parameters.

    Returns:
        str: The generated signature in hexadecimal format.
    """
    # Sort the parameters alphabetically
    sorted_params = sorted(parameters.items())

    # Concatenate the parameters into URL format
    concatenated = urllib.parse.urlencode(sorted_params, quote_via=urllib.parse.quote)

    # Generate the HMAC-SHA256 signature
    signature = HMAC(api_key.encode('utf-8'), concatenated.encode('utf-8'), sha256).hexdigest()
    return signature

# API configuration
url = 'https://sellercenter-api.falabella.com'
api_key = 'b1bdb357ced10fe4e9a69840cdd4f0e9c03d77fe'

# Request parameters
parameters = {
    'UserID': 'look@me.com',
    'Version': '1.0',
    'Action': 'FeedList',
    'Format': 'XML',
    'Timestamp': datetime.now().isoformat()  # Current time in ISO format
}

# Generate the signature and add it to the parameters
parameters['Signature'] = generate_signature(api_key, parameters.copy())

# HTTP headers for the request
headers = {
    'Accept': 'application/xml',
    'Content-type': 'application/xml',
}

# Make the GET request to the API
response = requests.get(url, headers=headers, params=parameters)

# Print the status code and response body
print(f"Status Code: {response.status_code}")
print(f"Response Body:\n{response.text}")
Llamada a la API en Visual Basic
Visual Basic

Imports System
Public Module modmain
	Sub Main()
		' add your data here:	
    Dim userId As String = "" 'login name / your email
    Dim password As String = "" 'your API key/password
    Dim version As String = "1.0"
    Dim action As String = "ProductCreate"
    Dim url As String = ""
    'e.g.: "https://sellercenter-api.falabella.com/"
    Dim result As String
    
    ' this is where the magic happens:
    result = generateRequest(url, userId, password, version, action)
    Console.WriteLine (result)
    End Sub

		Function generateRequest(Url As String, user As String, key as String, version As String, action As
String) As String
      Dim timeStamp as String = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss-0000")
      ' ATTENTION: parameters must be in alphabetical order
      Dim stringToHash As String = _
      "Action=" + URLEncode(action) + _
      "&Timestamp=" + URLEncode(timeStamp) + _
      "&UserID=" + URLEncode(user) + _
      "&Version=" + URLEncode(version)
      Dim hash As String = HashString(stringToHash, key)
      ' ATTENTION: parameters must be in alphabetical order
      Dim request As String = _
      "Action=" + URLEncode(action) + _
      "&Signature=" + URLEncode(hash) + _
      "&Timestamp=" + URLEncode(timeStamp) + _
      "&UserID=" + URLEncode(user) + _
      "&Version=" + URLEncode(version)
      return url + "?" + request
		End Function
    
    ' use this function instead of HttpServerUtility.UrlEncode()
    ' because we need uppercase letters
    Function URLEncode(EncodeStr As String) As String
    	Dim i As Integer
      Dim erg As String
      erg = EncodeStr
      erg = Replace(erg, "%", Chr(1))
      erg = Replace(erg, "+", Chr(2))
      For i = 0 To 255
        Select Case i
        ' *** Allowed 'regular' characters
          Case 37, 43, 45, 46, 48 To 57, 65 To 90, 95, 97 To 122, 126
          Case 1 ' *** Replace original % erg = Replace(erg, Chr(i), "%25")
          Case 2 ' *** Replace original + erg = Replace(erg, Chr(i), "%2B")
          Case 32 erg = Replace(erg, Chr(i), "+")
          Case 3 To 15 erg = Replace(erg, Chr(i), "%0" & Hex(i))
          Case Else
            erg = Replace(erg, Chr(i), "%" & Hex(i))
        End Select
      Next
      return erg
    End Function
    
    Function HashString(ByVal StringToHash As String, ByVal HachKey As String) As String
      Dim myEncoder As New System.Text.UTF8Encoding
      Dim Key() As Byte = myEncoder.GetBytes(HachKey)
      Dim Text() As Byte = myEncoder.GetBytes(StringToHash)
      Dim myHMACSHA256 As New System.Security.Cryptography.HMACSHA256(Key)
      Dim HashCode As Byte() = myHMACSHA256.ComputeHash(Text)
      Dim hash As String = Replace(BitConverter.ToString(HashCode), "-", "")
	    Return hash.ToLower
		End Function
End Module
Llamada a la API en Adobe ColdFusion
XML

<!--- this is a sample Adobe ColdFusion script for sending API request to Seller Center --->
<!--- hashing function --->
<cffunction name="HMAC_SHA256" returntype="string" access="private" output="false">
  <cfargument name="Data" type="string" required="true" />
  <cfargument name="Key" type="string" required="true" />
  <cfargument name="Bits" type="numeric" required="false" default="256" />
  <cfset var i = 0 />
  <cfset var HexData = "" />
  <cfset var HexKey = "" />
  <cfset var KeyLen = 0 />
  <cfset var KeyI = "" />
  <cfset var KeyO = "" />
  <cfset HexData = BinaryEncode(CharsetDecode(Arguments.data, "iso-8859-1"), "hex") />
  <cfset HexKey = BinaryEncode(CharsetDecode(Arguments.key, "iso-8859-1"), "hex") />
  <cfset KeyLen = Len(HexKey)/2 />
  <cfif KeyLen gt 64>
    <cfset HexKey = Hash(CharsetEncode(BinaryDecode(HexKey, "hex"), "iso-8859-1"), "SHA-256", "iso-8859-1") />
    <cfset KeyLen = Len(HexKey)/2 />
  </cfif>
  <cfloop index="i" from="1" to="#KeyLen#">
    <cfset KeyI = KeyI & Right("0"&FormatBaseN(BitXor(InputBaseN(Mid(HexKey,2*i-
           1,2),16),InputBaseN("36",16)),16),2) />
    <cfset KeyO = KeyO & Right("0"&FormatBaseN(BitXor(InputBaseN(Mid(HexKey,2*i-
           1,2),16),InputBaseN("5c",16)),16),2) />
  </cfloop>
  <cfset KeyI = KeyI & RepeatString("36",64-KeyLen) />
  <cfset KeyO = KeyO & RepeatString("5c",64-KeyLen) />
  <cfset HexKey = Hash(CharsetEncode(BinaryDecode(KeyI&HexData, "hex"), "iso-8859-1"), "SHA-256", "iso-8859-1")
         />
  <cfset HexKey = Hash(CharsetEncode(BinaryDecode(KeyO&HexKey, "hex"), "iso-8859-1"), "SHA-256", "iso-8859-
                                                                                                  1") />