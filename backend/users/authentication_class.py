access_token_payload = {
    "email": "jmi.gmail.com",
}
x_api_key = "hr_4b3c5f8d-2c1e-4f9a-8b3c-5f8d2c1e4b3c"

if x_api_key is None:
    # use the normal JWT authentication class meaning this request is not from our identified systems.
    pass
else:
    # 1 check if the x_api_key is valid
    # 2 Get the system using the x_api_key
    # 3 get the user using the system using the access_token_payload
    # 4 if the user is not found, raise an exception
    # 5 if the user is found, set the user in the request and continue
    pass


# THERE IS A POSSIBILITY THAT A PERSON WILL HAVE THE SAME CREDENTIALS IN DIFFERENT SYSTEMS AND THEY WANT TO USE THE NON SYSTEM LOGIN
