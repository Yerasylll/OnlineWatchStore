
variable "mongodb_uri" {
  description = "MongoDB Atlas connection URI"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "MongoDB database name"
  type        = string
  default     = "onlineWatchStore"
}
