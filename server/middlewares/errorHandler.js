const errorHandler = (err, req, res, next) => {
    console.error(`[Error] ${err.name}: ${err.message}`);

    // Do not expose stack traces or DB internals in production-like environments
    const statusCode = err.statusCode || 500;
    const message = (statusCode === 500) ? 'Internal Server Error' : err.message;

    res.status(statusCode).json({ error: message });
};

module.exports = errorHandler;
