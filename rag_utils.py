# RAG utilities
"""
RAG (Retrieval-Augmented Generation) utilities for semantic search and question answering.
"""

import os
import logging
from typing import List, Tuple
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
import pickle
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RAGPipeline:
    """Handles vector embeddings and semantic search for meeting transcripts."""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the RAG pipeline with a sentence transformer model.
        
        Args:
            model_name: Name of the sentence-transformers model to use
        """
        logger.info(f"Initializing RAG pipeline with model: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.dimension = self.model.get_sentence_embedding_dimension()
        logger.info(f"Model loaded. Embedding dimension: {self.dimension}")
    
    def chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """
        Split text into overlapping chunks for better context retrieval.
        
        Args:
            text: The input text to chunk
            chunk_size: Target size of each chunk in characters
            overlap: Number of characters to overlap between chunks
            
        Returns:
            List of text chunks
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for chunking")
            return []
        
        # Split by paragraphs first to maintain context
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        
        chunks = []
        current_chunk = ""
        
        for paragraph in paragraphs:
            # If adding this paragraph exceeds chunk_size, save current chunk
            if len(current_chunk) + len(paragraph) > chunk_size and current_chunk:
                chunks.append(current_chunk.strip())
                # Start new chunk with overlap from previous chunk
                overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
                current_chunk = overlap_text + " " + paragraph
            else:
                current_chunk += ("\n\n" if current_chunk else "") + paragraph
        
        # Add the last chunk
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        logger.info(f"Created {len(chunks)} chunks from text of length {len(text)}")
        return chunks
    
    def create_vector_store(self, chunks: List[str]) -> Tuple[faiss.Index, List[str]]:
        """
        Create a FAISS vector store from text chunks.
        
        Args:
            chunks: List of text chunks to embed
            
        Returns:
            Tuple of (FAISS index, original chunks)
        """
        if not chunks:
            logger.error("No chunks provided for vector store creation")
            raise ValueError("Cannot create vector store from empty chunks")
        
        logger.info(f"Creating embeddings for {len(chunks)} chunks...")
        
        # Generate embeddings
        embeddings = self.model.encode(chunks, show_progress_bar=True)
        embeddings = np.array(embeddings).astype('float32')
        
        # Normalize embeddings for cosine similarity
        faiss.normalize_L2(embeddings)
        
        # Create FAISS index
        index = faiss.IndexFlatIP(self.dimension)
        index.add(embeddings)
        
        logger.info(f"Vector store created with {index.ntotal} vectors")
        return index, chunks
    
    def search_vector_store(
        self, 
        index: faiss.Index, 
        chunks: List[str], 
        query: str, 
        top_k: int = 3
    ) -> List[Tuple[str, float]]:
        """
        Search the vector store for relevant chunks.
        
        Args:
            index: FAISS index
            chunks: Original text chunks
            query: Search query
            top_k: Number of top results to return
            
        Returns:
            List of (chunk, similarity_score) tuples
        """
        if not query or not query.strip():
            logger.warning("Empty query provided for search")
            return []
        
        logger.info(f"Searching for: '{query[:50]}...'")
        
        # Generate query embedding
        query_embedding = self.model.encode([query])
        query_embedding = np.array(query_embedding).astype('float32')
        faiss.normalize_L2(query_embedding)
        
        # Search
        distances, indices = index.search(query_embedding, min(top_k, len(chunks)))
        
        # Prepare results
        results = []
        for idx, distance in zip(indices[0], distances[0]):
            if idx < len(chunks):  # Safety check
                results.append((chunks[idx], float(distance)))
                logger.debug(f"Found chunk {idx} with similarity {distance:.4f}")
        
        logger.info(f"Returned {len(results)} results")
        return results
    
    def get_context_for_query(
        self, 
        index: faiss.Index, 
        chunks: List[str], 
        query: str, 
        top_k: int = 3,
        min_similarity: float = 0.3
    ) -> str:
        """
        Get formatted context for a query by retrieving and combining top chunks.
        
        Args:
            index: FAISS index
            chunks: Original text chunks
            query: Search query
            top_k: Number of chunks to retrieve
            min_similarity: Minimum similarity threshold
            
        Returns:
            Formatted context string
        """
        results = self.search_vector_store(index, chunks, query, top_k)
        
        # Filter by minimum similarity
        filtered_results = [
            (chunk, score) for chunk, score in results 
            if score >= min_similarity
        ]
        
        if not filtered_results:
            logger.warning(f"No results above similarity threshold {min_similarity}")
            return ""
        
        # Combine chunks with separators
        context_parts = []
        for i, (chunk, score) in enumerate(filtered_results, 1):
            context_parts.append(f"[Relevant Section {i}] (Relevance: {score:.2f})\n{chunk}")
        
        context = "\n\n---\n\n".join(context_parts)
        logger.info(f"Generated context of length {len(context)} from {len(filtered_results)} chunks")
        
        return context


# Global RAG pipeline instance
_rag_pipeline = None


def get_rag_pipeline() -> RAGPipeline:
    """Get or create the global RAG pipeline instance."""
    global _rag_pipeline
    if _rag_pipeline is None:
        model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        _rag_pipeline = RAGPipeline(model_name)
    return _rag_pipeline