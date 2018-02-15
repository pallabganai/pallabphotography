module.exports = generateRandomString

const adjectives = require('adjectives')
const animals = require('animals')
const randomNumber = require('random-number-in-range')

function generateRandomString () {
  return [randomAdjectives(), animals(), randomNumber(10, 99)].join('-')
}

function randomAdjectives () {
  return adjectives[randomNumber(0, adjectives.length - 1)]
}
