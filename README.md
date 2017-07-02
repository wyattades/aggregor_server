# Aggregor Server <img src="https://travis-ci.org/wyattades/webapp.svg?branch=master"/>

[Aggregor](http://www.aggregor.us/) is an aggregating website that pulls feeds from other sources into a single, susinct feed.  

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

**Endpoint:** `/plugins`  
**Methods:**  
- `POST`  
 **Description:** get available plugins  
 **Authentication:** none  
 **Request:**   
 **Response:**
  - plugins (object)

**Endpoint:** `/session`  
**Methods:**  
- `POST`  
 **Description:** generate a new authentication token  
 **Authentication:** none  
 **Request:**  
  - username (string {32}; **required**)
  - password (string {8-120}; **required**)
  
  **Response:**
  - token (string)

**Endpoint:** `/session`  
**Methods:**
- `DELETE`  
 **Description:** delete the authentication token that was sent alongside the request  
 **Authentication:** token  
 **Request:**  
 **Response:** 

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

**Endpoint:** `/user/<username>`  
**Methods:**
 - `PUT`  
 **Description:** update user's password  
 **Authentication:** token  
 **Request:**  
  
   - username (string {32})
   - email (string {50})
   - first_name (string {32})
   - last_name (string {32})
   - password (string {8-120})  
   
   **Response:**  

 - `DELETE`  
 **Description:** delete a user  
 **Authentication:** token  
 **Request:**
   - password (string {8-120}; **required**)  
   
   **Response:**   

 - `GET`  
 **Description:** fetch user data  
 **Authentication:** token  
 **Request:**   
 **Response:**   
   - email (string)
   - username (string)
 
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
  - feedNames (array)  

**Endpoint:** `/user/<username>/feed/<feed_name>`  
**Methods:**

- `PUT`  
 **Description:** update feed 
 **Authentication:** token  
 **Request:**  
  - name (string {32})

  **Response:**

- `DELETE`  
 **Description:** deletes specified feed  
 **Authentication:** token  
 **Request:**  
 **Response:**

**Endpoint:** `/user/<username>/feed/<feed_name>/<page>`  
**Methods:**
- `GET`  
 **Description** Fetch feed entries for certain page   
 **Authentication:** token  
 **Request:**    
 **Response:**  
  - entries (array)

**Endpoint:** `/user/<username>/feed/<feed_name>/plugin`  
**Methods:**

- `POST`  
 **Description:** add a new plugin to the specified feed, returns plugin id.  
 **Authentication:** token  
 **Request:**  
  - type (string {64}; **required**)  
  - priority (number [0,1]; **required**)
  - data (object (*see Plugin Data*); **required**)  
 
  **Response:**
  - id (string)

- `GET`  
 **Description:** fetch plugins  
 **Authentication:** token  
 **Request:**    
 **Response:** 
  - plugins (array)

 **Endpoint:** `/user/<username>/feed/<feed_name>/plugin/<plugin_id>`  
**Methods:**

- `PUT`  
 **Description** update plugin settings  
 **Authentication:** token  
 **Request:**    
  - type (string {64})  
  - priority (number [0,1])
  - data (object (*see Plugin Data*))
 
  **Response:**  
 
- `DELETE`  
 **Description:** remove a plugin from the specified feed  
 **Authentication:** token  
 **Request:**  
 **Response:**  
   
### Authentication  

To authenticate with the server, simply pass the header `X-Aggregor-Token: <token>` along with every request that requires it.

### Plugin Data
Data object that is passed when creating or updating plugin must match the following structure, depending on plugin type:
- hackernews
- reddit:
  - subreddit (string {32}; **optional**)

