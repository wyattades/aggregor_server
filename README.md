# Aggregor Server <img src="https://travis-ci.org/wyattades/webapp.svg?branch=master"/>

[Aggregor](http://www.aggregor.us/) is an aggregating website that pulls feeds from other sources into a single, susinct web page.  

1. Setup
2. Documentation  
 a. Endpoints  
 b. Authentication

## Setup

1. Install [Node](https://nodejs.org/en/download/package-manager/)
2. Install and configure [PostgreSQL](https://www.postgresql.org/docs/9.5/static/tutorial-install.html)
3. Configure `config.json` appropriately

## Documentation  
### Endpoints  

Every response contains a `code` corresponding to a valid HTTP, a `msg` containing a valid HTTP message, and a `data` object which is documented per endpoint & method below.  

**Endpoint:** `/user`  
**Methods:**
- `POST`  
 **Description:** create a new user  
 **Authentication:** none  
 **Request:**

  - username (string {32}; **required**)
  - email (string {50})
  - first_name (string {32}; **required**)
  - last_name (string {32}; **required**)
  - password (string {8-120}; **required**)  
  
  **Response:**  
   - token (string)

- `DELETE`  
 **Description:** delete a user  
 **Authentication:** token  
 **Request:**

  - username (string {32}; **required**)
  - password (string {8-120}; **required**)  
  
  **Response:**  

**Endpoint:** `/user/login`  
**Methods:**  
- `POST`  
 **Description:** generate a new authentication token  
 **Authentication:** none  
 **Request:**  
  - username (string {32}; **required**)
  - password (string {8-120}; **required**)
  
  **Response:**
  - token (string)

**Endpoint:** `/user/logout`  
**Methods:**
- `DELETE`  
 **Description:** delete the authentication token that was sent alongside the request  
 **Authentication:** token  
 **Request:**  
 **Response:**  
 
**Endpoint:** `/user/<username>/feed`  
**Methods:**
- `POST`  
 **Description:** create a new feed  
 **Authentication:** token  
 **Request:**  
  - name (string {32}; **required**)  
  
  **Response:**  
 
- `GET`  
 **Description:** fetch list of feed names  
 **Authentication:** token  
 **Request:**  
 **Response:** 
  - names (array)  
 
**Endpoint:** `/user/<username>/feed/<feed_name>`  
**Methods:**

- `POST`  
 **Description:** add a new plugin to the specified feed, returns parsed plugin. Use `raw` and pass `url` in the data object to receive raw HTML.  
 **Authentication:** token  
 **Request:**  
  - type (string {64}; **required**)  
  - data (object; **required**)  
 
  **Response:**
  - entries (array)

- `GET`  
 **Description:** fetch plugins  
 **Authentication:** token  
 **Request:**    
 **Response:** 
  - plugins (array)
 
- `DELETE`  
 **Description:** remove specified feed  
 **Authentication:** token  
 **Request:**  
 **Response:**  
 
 **Endpoint:** `/user/<username>/feed/<feed_name>/<plugin_id>`  
**Methods:**

- `POST`  
 **Description** update plugin settings, returns parsed plugin  
 **Authentication:** token  
 **Request:**    
 **Response:**  
  - plugins (array)  

- `GET`  
 **Description:** fetch parsed plugin  
 **Authentication:** token  
 **Request:**    
 **Response:**  
  - plugins (array)
 
- `DELETE`  
 **Description:** remove a plugin from the specified feed  
 **Authentication:** token  
 **Request:**  
 **Response:**  
   
### Authentication  

To authenticate with the server, simply pass the header `X-Aggregor-Token: <token>` along with every request that requires it.
